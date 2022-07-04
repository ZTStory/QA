---
theme: geek-black
highlight: a11y-dark
---

## 需求

单页面应用中，用户进入表单填写页面，需要初始化表单内容，填写过程中可能涉及到地图选点或者列表选择等操作，需要到新的页面选择并回调显示。

此时我们需要缓存表单填写页面实例，当退出表单填写或提交完表单内容之后，需要销毁当前表单实例，下次进入重新进行初始化

## 思考

说到 `Vue` 缓存，我们肯定首先选择官方提供的缓存方案 `keep-alive` 内置组件来实现。

`keep-alive` 组件提供给我们缓存组件的能力，可以完整的保存当前组件的状态，这帮了我们很大的忙

但实际业务场景中，我们很多时候是按需缓存页面的，就像 `App` 开发那样，每个页面都是单独的一个页面实例，由于 `Vue Router` 的限制，每个页面有固定的一个 `path`，所以导致每次访问这个 `path` 都会命中同一个组件实例

这个时候可能会有小伙伴说

> 诶，不是可以用 `activated` 来进行页面更新或者处理吗？

没错，是可以这样，但是，有些操作是 `mounted` 里面要做，有些需要放到 `activated` 里面更新，代码要处理很多进入页面的操作，就很麻烦啊。

**此时就有两个思考方向：**

1. 在必要的时候清除掉缓存页面的实例
2. 每次 push 页面的时候，保证当前页面是全新的实例对象，和 `App` 页面栈相同

第二种方案可以比较物理的解决需求中的问题，但是需要改动的地方很多，比如 `Vue Router` 中路由切换的时候，是否采用动态生成 `path` ，确保当前页面实例不唯一，而且我们也要做好自己的页面栈管理，类似于 `iOS` 中的 `UINavigationController` ，以便于及时清理栈中缓存的页面实例

因为改动比较大，而且需要大量测试，所以最后还是选择在**方案一**的方向进行探索和尝试。

## 尝试

#### 1. 手动操作 `keep-alive` 组件的 `cache` 数组

```js
//  Vue 2 keep-alive 部分源码片段
const { cache, keys } = this;
const key: ?string =
    vnode.key == null
        ? // same constructor may get registered as different local components
          // so cid alone is not enough (#3269)
          componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : "")
        : vnode.key;
if (cache[key]) {
    vnode.componentInstance = cache[key].componentInstance;
    // make current key freshest
    remove(keys, key);
    keys.push(key);
} else {
    // delay setting the cache until update
    this.vnodeToCache = vnode;
    this.keyToCache = key;
}
```

通过**路由守卫**在特定的情况下删除 `cache` 数组中的页面实例，同时 `destory` 当前实例

```js
removeKeepAliveCacheForVueInstance(vueInstance) {
    let key =
        vueInstance.$vnode.key ??
        vueInstance.$vnode.componentOptions.Ctor.cid + (vueInstance.$vnode.componentOptions.tag ? `::${vueInstance.$vnode.componentOptions.tag}` : "");
    let cache = vueInstance.$vnode.parent.componentInstance.cache;
    let keys = vueInstance.$vnode.parent.componentInstance.keys;
    if (cache[key]) {
        vueInstance.$destroy();
        delete cache[key];
        let index = keys.indexOf(key);
        if (index > -1) {
            keys.splice(index, 1);
        }
    }
}
```

这种方案比较繁琐，但由于是直接操作 `cache` 数组，可能会产生一些预期外的泄漏问题或者运行问题，虽然我自己尝试的时候没有发现。。

在 `Vue 3` 中我也尝试去寻找对应的 `cache` 数组，还真被我找到了，但是 `Vue 3` 源码中对于 `cache` 数组的操作权限仅限于开发环境

```ts
// Vue 3 KeepAlive 组件片段
if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    ;(instance as any).__v_cache = cache
}
```

部署生产环境之后就没办法通过 `instance.__v_cache` 来获取 `cache` 数组了，所以这种方案到 Vue 3 就没办法进行下去啦。

于是乎，就有了第二个尝试

#### 2. `exclude` 大法好

之前接触 `keep-alive` 所有注意力都放在 `include` 这个属性上面，其实 `exclude` 属性同样重要，而且效果和我们直接删除 `cache` 数组异曲同工。

```ts
// Vue 3 KeepAlive 组件片段
 if (
    (include && (!name || !matches(include, name))) ||
    (exclude && name && matches(exclude, name))
    ) {
        current = vnode
        return rawVNode
    }
```

如果 `exclude` 里面有值，那么就返回当前新的实例不从 `cache` 里面获取。而且 `exclude` 的优先级是高于 `include` 的。

利用这一点，我们就可以通过操作 `exclude` 中的内容，来达到控制缓存页面的效果。

而且 `exclude` 在 `Vue 3` 中的控制更为方便，只需要定义一个全局的 `exclude` 响应式变量就可以随处操作了，清除的具体方式取决于业务流程

```ts
export const excludes = ref<string[]>([]);
// 需要删除的时候
export function removeKeepAliveCache(name: string) {
    excludes.value.push(name);
}
// 需要恢复缓存的时候
export function resetKeepAliveCache(name: string) {
    excludes.value = excludes.value.filter((item) => item !== name);
}
```

## Demo

这里提供一个小 demo 演示一下缓存清除效果：

[https://ztstory.github.io/vue-composition-demo/#/](https://ztstory.github.io/vue-composition-demo/#/)

流程：

-   `Index` 与 `Input` 为缓存页面

-   `Input` 返回到 `Index` 时清除 `Input` 缓存，重新进入 `Input` 页面激活缓存

Demo 源码地址：[https://github.com/ZTStory/vue-composition-demo](https://github.com/ZTStory/vue-composition-demo)
