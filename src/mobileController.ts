import { Vector2 } from "three";

export default class MobileController {
  private coords: Vector2 = new Vector2(0, 0);
  private anchor: Vector2 = new Vector2(0, 0);
  private value: Vector2 = new Vector2(0, 0);
  private buttonSize: Vector2 = new Vector2(0, 0);
  private touching: boolean = false;

  private canvas: HTMLCanvasElement;
  private onChangeCallback: (value: Vector2) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onChangeCallback: (value: Vector2) => void
  ) {
    canvas.style.display = "block";
    this.onChangeCallback = onChangeCallback;
    this.canvas = canvas;
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.coords = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
    this.anchor = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
    this.buttonSize = new Vector2(15, 15);

    this.update();

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      // console.log(e);
      let touchesId = 0; //use the touchId of the touch within the boundary of the canvas
      if (
        e.touches[0].clientX > this.canvas.offsetLeft &&
        e.touches[0].clientX < this.canvas.offsetLeft + this.canvas.width
      ) {
        touchesId = 0;
      } else {
        touchesId = 1; //assume that there is a max of 2 possible fingers on the screen
      }
      this.anchor.x = e.touches[touchesId].clientX - this.canvas.offsetLeft;
      this.anchor.y = e.touches[touchesId].clientY - this.canvas.offsetTop;
      this.coords.x = e.touches[touchesId].clientX - this.canvas.offsetLeft;
      this.coords.y = e.touches[touchesId].clientY - this.canvas.offsetTop;
      this.touching = true;
    });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      // console.log(e);
      let touchesId = 0; //use the touchId of the touch within the boundary of the canvas
      if (
        e.touches[0].clientX > this.canvas.offsetLeft &&
        e.touches[0].clientX < this.canvas.offsetLeft + this.canvas.width
      ) {
        touchesId = 0;
      } else {
        touchesId = 1; //assume that there is a max of 2 possible fingers on the screen
      }
      this.coords.x = e.touches[touchesId].clientX - this.canvas.offsetLeft;
      this.coords.y = e.touches[touchesId].clientY - this.canvas.offsetTop;
      // console.log(
      //   e.touches[0].clientX,
      //   e.touches[0].clientY,
      //   this.canvas.offsetLeft,
      //   this.canvas.offsetTop
      // );
      // 517.7142944335938 872.0000610351562 0 716
    });

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.coords.x = this.canvas.width / 2;
      this.coords.y = this.canvas.height / 2;
      this.touching = false;
    });

    // this.canvas.addEventListener("mousemove", (e) => {
    //   if (e.button === 1) {
    //     this.coords.x = e.pageX - this.canvas.offsetLeft;
    //     this.coords.y = e.pageY - this.canvas.offsetTop;
    //   }
    // });

    // this.canvas.addEventListener("mouseup", (e) => {
    //   if (e.button === 1) {
    //     this.coords.x = this.canvas.clientWidth / 2;
    //     this.coords.y = this.canvas.clientHeight / 2;
    //   }
    // });

    setInterval(() => {
      this.update();
    }, 20);
  }

  private update() {
    // this.value.x =
    //   -(
    //     (this.canvas.clientWidth / 2 - this.coords.x) /
    //     this.canvas.clientWidth
    //   ) * 2;
    // this.value.y =
    //   ((this.canvas.clientHeight / 2 - this.coords.y) /
    //     this.canvas.clientWidth) *
    //   2;
    if (this.touching) {
      this.value.x = -(this.anchor.x - this.coords.x);
      this.value.y = this.anchor.y - this.coords.y;

      console.log(this.value);

      this.onChangeCallback(this.value);
      const ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
      ctx.fillStyle = "black";
      ctx.fillRect(
        this.coords.x - this.buttonSize.x / 2,
        this.coords.y - this.buttonSize.y / 2,
        this.buttonSize.x,
        this.buttonSize.y
      );
    } else {
      this.value.x = 0;
      this.value.y = 0;
      this.onChangeCallback(this.value);
    }
  }
}
