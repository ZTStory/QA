interface DrawPoint {
    x: undefined | number;
    y: undefined | number;
}

export function clearCanvas(context: CanvasRenderingContext2D) {
    if (context) {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.fillStyle = "white";
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    }
}

export function isCanvasBlank(canvas: HTMLCanvasElement) {
    const blank = document.createElement("canvas");
    const context = blank.getContext("2d");
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (context) {
        context.fillStyle = "white";
        context.fillRect(0, 0, blank.width, blank.height);
    }
    return blank.toDataURL() == canvas.toDataURL();
}

export default function useCanvasPainting(canvas: HTMLCanvasElement) {
    canvas.width = document.documentElement.clientWidth - 32;
    canvas.height = canvas.width / 2;

    const context = canvas.getContext("2d") as CanvasRenderingContext2D;

    // 初始化白色画布
    context.fillStyle = "white";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    let painting = false;
    let lastPoint = { x: undefined, y: undefined } as DrawPoint;

    const drawLine = (start: DrawPoint, end: DrawPoint) => {
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
    const canvasRect = canvas.getBoundingClientRect();
    console.log(canvasRect);

    canvas.ontouchstart = (e) => {
        painting = true;
        const x = e.touches[0].clientX - canvasRect.x;
        const y = e.touches[0].clientY - canvasRect.y;
        lastPoint = { x, y };
        console.log(lastPoint);
    };
    canvas.ontouchmove = (e) => {
        if (painting) {
            // 注意canvas组件的布局与client的偏移量
            const newPoint = { x: e.touches[0].clientX - canvasRect.x, y: e.touches[0].clientY - canvasRect.y };

            drawLine(lastPoint, newPoint);
            lastPoint = newPoint;
        }
    };

    canvas.ontouchend = () => {
        painting = false;
        console.log("ontouchend", painting);
    };

    return {
        context,
    };
}
