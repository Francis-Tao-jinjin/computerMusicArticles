# AudioParam 音频参数

webAudio API 中，几乎所有的可操控的数据都是通过 AudioParam 实现的，可以说是整个 API 中非常重要的一部分，可是也不那么好懂。

## audioParam 的原理
就从 audioParam 内部的原理和实现开始吧。首先需要一直在脑海里有个印象，<B>音频系统是与时间相关的</B>。“时间相关”听起来好像很简单，不过随着问题的深入，会发现其实和其他时间无关的程序有很大的思维上的不同。

由于时间相关的原因，audioParam 中存储的值就不能只是一个无记录的平常量，而是一连串保留了修改记录的数据，这些数据记录了过去已经发生的事件的信息以及未来准备发生的事件的信息，现在暂且将这整个历史数据称作 paramTimeline。

### AudioParam TimeLine
以最简单的 GainNode.gain 为例，gain 是一个 AudioParam，每次预约改变 gain 的值时，会创建一个带时间戳记录，假设某个记录长这样：`{ time: 1, ...其他字段 }`。
那么一整个时间线上会有若干个类似这样的记录：
`[{time:1, ...}, {time:1.3, ...}, {time: 2, ...}, {time:2.78, ...},..., {time:5.9, ...}]` 。考虑到 gain 的 value 是可以任何时侯被取得的（任何时候就是值 time 为 audioContext.currentTime 的任何一个值时，注意时间线中只存储了若干时间离散的记录），那么在其他字段中就应当记录足够的信息用以计算任意时刻的 value。

这时就需要介绍 AudioParam 的调度方式 -- 告知 Audio线程 该数值何时发生何种变化。没错，简单的概括就是前面那句话，参考 [MDN 文档](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam)，具体提供的方法有 7 个
```js
setValueAtTime(value, startTime)
linearRampToValueAtTime(value, endTime)
exponentialRampToValueAtTime(value, endTime)
setTargetAtTime(target, startTime, timeConstant)
setValueCurveAtTime(values, startTime, duration)
cancelScheduledValues(startTime)
cancelAndHoldAtTime(cancelTime)
```
先说 <b>setValueAtTime</b>，其实 audioParam.value 的 setter 就是 setValueAtTime 一个 startTime 为 audioContext.currentTime 的封装。虽然名字叫 setValue，但实际的作用是在某个时刻以几乎瞬间将数值变化到预期值，通常来说 startTime >= audioContext.currentTime，因为如果小于 audioContext.currentTime 那就是‘尝试改变过去的值’，这当然是没有用的。

<image src="./assets/setValueAtTime.png" height="235px" align=center/>

（横轴代表时间，纵轴代表 audioParam 的数值）

上图代表 setValueAtTime 的一个例子，即：param 初始值为 2，当前时间为 3（audioContext.currentTime = 3），此时设置 param 在一秒后（也就是第 4 秒）数值变为 4。
图中绿色的线代表了当前时间，红色的线条可以看作是 audioParam 关于时间的函数，紫色的点则是 timeline 中的记录点。<b>记录点是离散的，函数是连续的。</b> 所以，对于setValueAtTime的情况，记录点如果同时存储 <b>时间戳，变化后的值，变化类型</b> 就足够表示连续的 audioParam 函数了：
```js
{
  time: 0,
  value: 2,
  type: 'setValueAtTime'
},
{
  time: 4,
  value: 4,
  type: 'setValueAtTime'
}
```

接下来分析 <b>linearRampToValueAtTime</b>，这方法可以将数值线性的变化到预期值，但是这里有一个很大的问题，它接收的时间参数只有 endTime，而没有 startTime，也就是说只知道再何时完成变化，却不知道何时开始变化。现在假设有一下几种情况：

1：初始值为2，在 currentTime = 3 的时候，先设置 param 在第 4 秒突变为 4，然后再线性变化到 1，并且在第 8 秒完成变化。

<image src="./assets/linearRampToValueAtTime1.png" width="435px" align=center/>

2：初始值为2，在 currentTime = 3 的时候，设置 param 线性变化到 1，并且在第 8 秒完成变化。

<image src="./assets/linearRampToValueAtTime2.png" width="435px" align=center/>

3：初始值为2，在 currentTime = 5 的时候，设置 param 线性变化到 1，并且在第 8 秒完成变化。

<image src="./assets/linearRampToValueAtTime3.png" width="435px" align=center/>

可以看出，在参数相同的情况下调用 linearRampToValueAtTime（value = 1，endTime = 8），最终得到的结果却千差万别，不仅调用方法的时间有关系，就连在它之前的记录点也会产生影响。此时，我们根本没有办法确定当 t=4.4, t=5.2, t=6.8 时，param 的值是多少 >_<（不确定性是很糟糕很棘手的）。与 linearRampToValueAtTime 类似，exponentialRampToValueAtTime 一样有这样的问题，两者的区别只是前者是线性变化，后者是指数速率的变化，同样是上面三个例子，使用 exponentialRampToValueAtTime 得到的情况为：

<image src="./assets/exponentialRampToValueAtTime1.png" width="435px" align=center/>
<image src="./assets/exponentialRampToValueAtTime2.png" width="435px" align=center/>
<image src="./assets/exponentialRampToValueAtTime3.png" width="435px" align=center/>

可见，若要使 param 的值可以确定，至少要调整 linearRampToValueAtTime 和 exponentialRampToValueAtTime 的使用方法。现在提出两个新的方法：<b>linearRampTo</b> 和 <b>exponentialRampTo</b>，两者分别封装相应的原生方法，接受的参数变为三个：value，startTime，rampTime。
```
value     变化结束时的值
startTime 开始变化的时间
rampTime  变化的时间长度
```
并且在变化开始的时候在 timeline 上添加一个记录点（也就是 setValue 类型的记录点）。
对于上述三个例子中的第一个，时间线上就会有 4 个记录点，其中第二个点和第三个点虽然重合，但是代表的意义是不同的：
```js
{
  time: 0,
  value: 2,
  type: 'setValueAtTime'
},
{
  time: 4,
  value: 4,
  type: 'setValueAtTime'
},
// 接下来的两个记录点是 exponentialRampTo 的记录点
{
  time: 4,
  value: 4,
  type: 'setValueAtTime'
},
{
  time: 8,
  value: 1,
  type: 'exponentialRampToValueAtTime'
}
```
有这 4 个记录点，就可以完整的表示 param 关于时间的函数了，并且只要知道时间 t，就可以计算出 t 时刻 param 的值，其中涉及到的插值函数会在下文细说。

<b>setTargetAtTime</b>

与前面三种变化方式相比，setTargetAtTime 的作用不那么直观，它的三个参数为 target, startTime, timeConstant。其中 startTime 顾名思义，主要解释一下另两个参数。
`target`，值得是期望的目标值，听起来好像和其他三种方法中的参数 `value` 没有区别啊，之所以要换一个名字是因为 setTargetAtTime 方法采用以 e 的负指数作为变化率来无限逼近 target 的，说起来挺复杂，下面用图表示这个过程：


<image src="./assets/setTargetAtTime.png" width="635px" align=center/>

上图中，v1 是 startTime 时的值， v2 是 target g 是第三个参数 timeConstant，从函数表达式能直接看出，timeConstant 影响了 y 趋近与 target 的速度，它的值越小，上升（下降）的越快，值越大，上升（下降）的越慢，如果将变化的过程用百分比表示，那么每经过一个 timeConstant 的时常，就会朝 target 逼近 63.2%。虽然永远不会达到 target，但是大多数情况下，只要数值十分接就可以了，当时间经过 6 个 timeConstant，变化过程以及完成了 99.75% （1 - e<sup>-6</sup> = 0.9975212478233336），就如上图中时间为 3 时，其实看起来 y 的值以及和 3 无异了。

为了使 param 的值最终能变为 target，不妨在取一个时间长度 T，并在 startTime + T 时刻设置记录点，类型为 setValueAtTime，这里 T 暂时取 6 * timeConstant。

因此，如果用一个新的函数 `targetRampTo(value, rampTime, startTime)` 封装一下，其中的参数 value 对应到原本的 target，rampTime/6 就是 timeConstant。一个 setTargetAtTime 的变化也可以用两个记录点表示：
```js
{
  time: startTime,
  value: target,
  timeConstant: timeConstant,
  type: 'SetTargetAtTime',
},
{
  time: starTime + 6 * timeConstant,
  value: target,
  type: 'setValueAtTime'
},
```

setValueCurveAtTime，参考 [文档](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setValueCurveAtTime)，它的效果是按照给定的一组数值通过线性插值进行变化，其实就是一连串的 linearRampToValueAtTime。


<b>cancelScheduledValues 与 cancelAndHoldAtTime</b>
这两个方法的作用都是取消先前预定的变化，不过稍微有一些不同，用一个例子说明：

设有一个 GainNode 的 gain 初始值为 1。此时 audioContext.currentTime 为 3，然后执行 
```js
const now = audioContext.currentTime;
gain.linearRampToValueAtTime(3, now + 2);
gain.cancelScheduledValues(now + 1);
```
这里做的事情是首先希望 gain 的值在第三秒时的 1 开始线性的变化到 3，第五秒结束变化，然后又立刻调用 cancelScheduledValues 取消 第四秒之后的变化过程。最终的结果是线性变化不会发生，gain 的值始终为1 。
如果执行的不是 cancelScheduledValues 而是 cancelAndHoldAtTime，那么在第四秒之前，线性变化依然有效，只是第四秒时停止变化，最终 gain 的值为 2。

在预定的变化还未发生的时候，如果 cancelScheduledValues 的时间与变化有重叠，那么整个预定的变化都会取消。

如果变化已经发生，那么 cancelScheduledValues 和 cancelAndHoldAtTime 的作用是一样的，比如：
```js
const now = audioContext.currentTime;
gain.linearRampToValueAtTime(3, now + 2);
setTimeout(() => {
  gain.cancelScheduledValues(audioContext.currentTime);
}, 1000);
```
假设这个例子中的 setTimeout 能及准时的在 1 秒钟后触发，那么最终的结果 gain 的值为 4。

### Interpolate 插值

这里只说明一下 exponentialRampToValueAtTime 和 setTargetAtTime 两个方法会用到的插值函数，

exponentialRampToValueAtTime: y = v2*((v1/v2)^(x))

setTargetAtTime: y = v2 (v1 - v2)*(1 - e^(-x/g))

x 为开始变化后流逝的时间，v1 为初始值，v2 为目标值，g 为 timeConstant。

## conclusion 总结
原生的 audioParam 使用起来确实有点模糊不清，上文一开始提到的 timeline 其实在 webkit 和 chromium 的中是有功能类似的实现（[查看此处](https://cs.chromium.org/chromium/src/third_party/blink/renderer/modules/webaudio/audio_param_timeline.h?dr&g=0&l=43)），可是这些并没有提供 js 接口，如果想在 js 程序中完全的控制 audioParam 的行为，只能再另行构造。

大致的实现可以[查看我的 github](https://github.com/TaoJinjin-Thomas/EasuAL/blob/master/src/core/AutomationTimeline.ts)

