"use strict";
exports.__esModule = true;
exports.isCanvasBlank = exports.clearCanvas = void 0;
function clearCanvas(context) {
    if (context) {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.fillStyle = "white";
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    }
}
exports.clearCanvas = clearCanvas;
function isCanvasBlank(canvas) {
    var blank = document.createElement("canvas");
    var context = blank.getContext("2d");
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (context) {
        context.fillStyle = "white";
        context.fillRect(0, 0, blank.width, blank.height);
    }
    return blank.toDataURL() == canvas.toDataURL();
}
exports.isCanvasBlank = isCanvasBlank;
function useCanvasPainting(canvas) {
    canvas.width = document.documentElement.clientWidth - 32;
    canvas.height = canvas.width / 2;
    var context = canvas.getContext("2d");
    // 初始化白色画布
    context.fillStyle = "white";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    var painting = false;
    var lastPoint = { x: undefined, y: undefined };
    var drawLine = function (start, end) {
        if (!(start.x && start.y && end.x && end.y)) {
            return;
        }
        if (context) {
            context.beginPath();
            // 设置画笔
            context.fillStyle = "#000";
            context.strokeStyle = "#000";
            context.lineWidth = 2;
            context.lineCap = "round";
            context.lineJoin = "round";
            // 画线
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.stroke();
            context.closePath();
        }
    };
    var canvasRect = canvas.getBoundingClientRect();
    // 不理解为何x比一屏还要大
    // canvasRect.x -= document.documentElement.clientWidth;
    console.log(canvasRect);
    canvas.ontouchstart = function (e) {
        painting = true;
        var x = e.touches[0].clientX - canvasRect.x;
        var y = e.touches[0].clientY - canvasRect.y;
        lastPoint = { x: x, y: y };
        console.log(lastPoint);
    };
    canvas.ontouchmove = function (e) {
        if (painting) {
            // 注意canvas组件的布局与client的偏移量
            var newPoint = { x: e.touches[0].clientX - canvasRect.x, y: e.touches[0].clientY - canvasRect.y };
            drawLine(lastPoint, newPoint);
            lastPoint = newPoint;
        }
    };
    canvas.ontouchend = function () {
        painting = false;
        console.log("ontouchend", painting);
    };
    return {
        context: context,
    };
}
exports["default"] = useCanvasPainting;
