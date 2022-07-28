# Paging 快捷分页模型

开发移动端页面遇到大量的下拉刷新上拉加载模块？

每次都需要维护当前页数还有数据更新后的总页数处理？

如果这些操作都可以用一行代码实现：

```ts
// 下拉刷新
pageViewModel.headerRefreshing();
// 上拉加载
pageViewModel.footerRefreshing();
​
```

感兴趣的同学可以先戳这个[链接](https://ztstory.github.io/vue-composition-demo/#/PagingIndex)先行体验一下效果，也可以戳这个[链接](https://github.com/ZTStory/vue-composition-demo/tree/main/src/pages/use-paging)看一下源代码

接下来我们好好聊一聊怎么实现一行代码完成分页模块

## 功能分解

### 1、首先我们需要思考的是分页相关参数的处理

也就是 `pageSize（单页数目）`、 `currentPage（当前页）` 和 `totalPage（总页数）`

我们需要一个实例来维护和更新这些参数

这里我设计了一个 `class`

```ts
class PagingViewModel<T> {
    private currentPage: Ref<number>;
    private totalPage: Ref<number>;
    private pageSize: number;
​   // 状态变量
    refreshing: Ref<boolean>;
    loading: Ref<boolean>;
    finished: Ref<boolean>;
​
    constructor(opt: PagingOptions<T>) {
        this.pageSize = opt.pageSize ?? 20;
        this.currentPage = ref(1);
        this.totalPage = ref(1);
      
        this.refreshing = ref(false);
        this.loading = ref(false);
        this.finished = ref(false);
    }
}
```

使用 `PagingViewModel` 来管理这些参数，在触发刷新和加载行为之后实时更新，并且通过 3 个状态变量（**刷新中、加载中、已全部加载**）来标识此时的 `Paging` 加载状态

### 2、其次我们需要考虑数据的来源与更新

这里主要是体现在通过接口获取数据这一块

也就是 `params（请求参数）`、`requestFn（请求体）`、`datas（用于渲染的数据源）`

这里我们再将这些内容合并进上面的 class 中

```ts
class PagingViewModel<T> {
    private currentPage: Ref<number>;
    private totalPage: Ref<number>;
    private pageSize: number;
    // 新增属性
    private params: any;
    private datas: Ref<Array<T>>;
    private requestFn: (params: any) => Promise<any>;
    private responseCompletion?: (vm: PagingViewModel<T>, datas: Array<any>) => Array<any>;
​
    refreshing: Ref<boolean>;
    loading: Ref<boolean>;
    finished: Ref<boolean>;
​
    constructor(opt: PagingOptions<T>) {
        this.requestFn = opt.requestFn;
        this.params = opt.params || {};
        this.datas = opt.datas;
        this.pageSize = opt.pageSize ?? 20;
​
        this.currentPage = ref(1);
        this.totalPage = ref(1);
        this.refreshing = ref(false);
        this.loading = ref(false);
        this.finished = ref(false);
    }
}
```

现在我们的 `class` 已经初具雏形，可以为其增加行为 `loadData()`

```ts
/**
 * 加载数据
 */
loadData() {
    // 组合基本的请求参数
    const params = {
        currentPage: this.currentPage.value,
        pageSize: this.pageSize,
        ...this.params,
    };
​   // 刷新时清空数据源
    if (this.currentPage.value === 1) {
        this.datas.value = [] as Array<T>;
    }
​   // 网络请求主体
    this.requestFn(params).then((response) => {
        if (!response) {
            return;
        }
        // 记录总页数
        this.totalPage.value = response.totalPage;
        let resDatas = response.responseObject.items;
        if (this.responseCompletion) {
            // 需要特殊处理的数据源由该 hook 完成
            resDatas = this.responseCompletion(this, response.datas);
        }
        // 处理第一页和其他页数据组合
        if (this.currentPage.value === 1) {
            this.datas.value = resDatas;
        } else {
            this.datas.value = this.datas.value.concat(resDatas);
        }
        // 加载结束，更新状态
        this.didLoaded();
    });
}
/**
 * 加载结束，状态更新
 */
didLoaded() {
    // 处理第一页和其他页的状态
    if (this.currentPage.value === 1) {
        this.refreshing.value = false;
        this.finished.value = false;
    } else {
        this.loading.value = false;
    }
}
```

这里可能有小伙伴就有疑问了，**如果我需要对网络请求拿到的数据源进行处理后才提供给界面渲染怎么办？**

那我们就增加一个` Hook （responseCompletion）`来处理接口数据

剩下就是处理 `currentPage` 为 1 的情况和不为 1 的情况了

### 3、最后实现上拉加载和下拉刷新

```ts
/**
 * 下拉刷新
 */
headerRefreshing() {
    // 重置当前页并刷新数据
    this.currentPage.value = 1;
    this.loadData();
}
/**
 * 上拉加载
 */
footerRefreshing() {
    // 这里根据 totalPage 控制显示没有更多数据
    if (this.currentPage.value === this.totalPage.value) {
        this.finished.value = true;
        this.didLoaded();
        return;
    }
    // 当前页自增并请求下一页数据
    this.currentPage.value += 1;
    this.loadData();
}
```

到此，我们的 PagingViewModel 已经可以正常工作啦~

这里提供一下最基础的调用方式

```
// 网络请求
const requestFn = (params: any) => {
    return new Promise<any>((resolve) => {
        // 这里模拟请求数据
        const response = mockDatas(params.currentPage, params.pageSize);
        resolve(response);
    });
}
// 渲染数据源
const datas = ref<ResponseObject[]>([]);
// 分页vm
const pageViewModel = new PagingViewModel<any>({
    requestFn,
    datas,
    pageSize: 5,
});
// 刷新数据
pageViewModel.headerRefreshing();
// 加载数据
pageViewModel.footerRefreshing();
```
## 总结
这里想和大家分享的只是**构建快捷分页模型的一个思路**，具体细节的雕琢还需要深入思考

很多**分页参数的命名定义**可能会有所不同，**返回值的数据结构**也会有所不同

所以，大家领悟思路就好，可以根据这个思路做一套适合自己业务的分页模型