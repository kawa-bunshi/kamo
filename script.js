const TOTAL_STAMPS = 9;

let cameraStream = null;
let animationRunning = false;


/* ========================================
起動
======================================== */

document.addEventListener("DOMContentLoaded", () => {

render();

const params = new URLSearchParams(location.search);
const spotParam = params.get("spot");

// QRコードから開いた場合
if (spotParam !== null) {

const spot = Number(spotParam);

// URLからspotパラメータを取り除く
const url = new URL(location.href);
url.searchParams.delete("spot");
history.replaceState(null, "", url.pathname + url.search + url.hash);

if (
Number.isInteger(spot) &&
spot >= 0 &&
spot <= TOTAL_STAMPS
) {

if (spot === 0) {
startRally();
} else {
acquireStamp(spot);
}

}

}

updateStartDisplay();

// 完成済みなら刻印を再表示
if (getStampCount() === TOTAL_STAMPS) {
showCompletedState();
}

});


/* ========================================
スタンプラリー開始
======================================== */

function startRally() {

// すでに開始していれば時刻を変更しない
if (!localStorage.getItem("startTime")) {

localStorage.setItem(
"startTime",
new Date().toISOString()
);

}

updateStartDisplay();

// 初回だけ案内を表示
if (getStampCount() === 0) {
const message = document.getElementById("stampMessage");

message.textContent = "準備完了！";
message.classList.add("show");

setTimeout(() => {
message.classList.remove("show");
}, 1800);
}

}


/* ========================================
スタート状態の表示
======================================== */

function updateStartDisplay() {

const startTime = localStorage.getItem("startTime");

const guide = document.getElementById("startGuide");
const card = document.getElementById("stampCard");
const display = document.getElementById("startTimeDisplay");

const started = Boolean(startTime);

guide.hidden = started;
card.hidden = !started;
display.hidden = !started;

if (!started) {
display.textContent = "";
return;
}

const date = new Date(startTime);

if (Number.isNaN(date.getTime())) {
display.textContent = "スタート済み";
return;
}

const pad = n => String(n).padStart(2, "0");

display.textContent =
"スタート " +
date.getFullYear() + "." +
pad(date.getMonth() + 1) + "." +
pad(date.getDate()) + " " +
pad(date.getHours()) + ":" +
pad(date.getMinutes());
}


/* ========================================
グリッド描画
======================================== */

function render() {

const grid =
document.getElementById("grid");

grid.innerHTML = "";


for (
let i = 1;
i <= TOTAL_STAMPS;
i++
) {

const cell =
document.createElement("div");

cell.className = "cell";

cell.dataset.spot = i;


if (
localStorage.getItem(
"stamp_" + i
)
) {

const img =
document.createElement("img");

img.src =
`images/img_${i}.jpg`;

img.alt =
`スタンプ ${i}`;

cell.appendChild(img);

} else {

const q =
document.createElement("div");

q.className =
"question";

q.textContent = "?";

cell.appendChild(q);

}


/* -------------------------
開発用
マスを押すとスタンプ取得
------------------------- */

cell.addEventListener(
"click",
() => {

acquireStamp(i);

}
);


grid.appendChild(cell);

}

}


/* ========================================
スタンプ取得
======================================== */

async function acquireStamp(spot) {

// スポット0で開始していない場合
if (!localStorage.getItem("startTime")) {

alert(
"スタートの記録が見つかりません。\n" +
"受付でスタート用QRコードを読み取ってください。"
);

updateStartDisplay();
return;
}

if (animationRunning) {
return;
}


const key =
"stamp_" + spot;


/* 取得済み */

if (
localStorage.getItem(key)
) {

return;

}


animationRunning = true;


/*
* 先に保存する。
* アニメーション途中で閉じても
* スタンプを失わない。
*/

localStorage.setItem(
key,
"true"
);


const count =
getStampCount();


/*
* 9個目を取った瞬間を保存
*/

if (
count === TOTAL_STAMPS
) {

if (
!localStorage.getItem(
"goalTime"
)
) {

localStorage.setItem(
"goalTime",
new Date().toISOString()
);

}

}


/*
* スタンプ取得アニメーション
*/

await animateStamp(spot);


/*
* アニメーション終了後に
* 正式なグリッドへ描画
*/

render();


/*
* 9個目
*/

if (
count === TOTAL_STAMPS
) {

await completeSequence();

}


/*
* 1〜8個目
*/

else {

showStampMessage(
TOTAL_STAMPS - count
);

showConfetti();

await wait(2000);

}


animationRunning = false;

}


/* ========================================
スタンプ取得アニメーション
======================================== */

async function animateStamp(spot) {

const target =
document.querySelector(
`[data-spot="${spot}"]`
);


if (!target) {
return;
}


const img =
document.createElement("img");

img.src =
`images/img_${spot}.jpg`;

img.className =
"flying-stamp";

document.body.appendChild(img);


/*
* 画像読み込み待ち
*/

try {

await img.decode();

} catch (e) {

// decode非対応等でも続行

}


/* -------------------------
① 中央から大きくなる
------------------------- */

await img.animate(

[
{
opacity: 0,
transform:
"translate(-50%, -50%) scale(0)"
},

{
opacity: 1,
transform:
"translate(-50%, -50%) scale(1)"
}
],

{
duration: 650,

easing:
"cubic-bezier(.18,.85,.25,1)",

fill: "forwards"
}

).finished;


await wait(200);


/* -------------------------
② 回転しながら
所定位置へ
------------------------- */


const startRect =
img.getBoundingClientRect();

const targetRect =
target.getBoundingClientRect();


const startCenterX =
startRect.left +
startRect.width / 2;

const startCenterY =
startRect.top +
startRect.height / 2;


const targetCenterX =
targetRect.left +
targetRect.width / 2;

const targetCenterY =
targetRect.top +
targetRect.height / 2;


const moveX =
targetCenterX -
startCenterX;

const moveY =
targetCenterY -
startCenterY;


const scale =
targetRect.width /
startRect.width;


await img.animate(
[
{
transform:
"translate(-50%, -50%) " +
"translate(0px, 0px) " +
"rotate(0deg) " +
"scale(1)"
},

{
transform:
"translate(-50%, -50%) " +
`translate(${moveX}px, ${moveY}px) ` +
"rotate(720deg) " +
`scale(${scale})`
}
],
{
duration: 900,
easing: "cubic-bezier(.3,.65,.25,1)",
fill: "forwards"
}
).finished;


/* 着地した瞬間 */
vibrate(50);


/* 少し沈んで戻る */
await img.animate(
[
{
transform:
"translate(-50%, -50%) " +
`translate(${moveX}px, ${moveY}px) ` +
"rotate(720deg) " +
`scale(${scale})`
},

{
transform:
"translate(-50%, -50%) " +
`translate(${moveX}px, ${moveY}px) ` +
"rotate(720deg) " +
`scale(${scale * 0.96})`
},

{
transform:
"translate(-50%, -50%) " +
`translate(${moveX}px, ${moveY}px) ` +
"rotate(720deg) " +
`scale(${scale})`
}
],
{
duration: 180,
easing: "ease-out",
fill: "forwards"
}
).finished;


img.remove();

}


/* ========================================
スタンプGET表示
======================================== */

function showStampMessage(
remaining
) {

const message =
document.getElementById(
"stampMessage"
);


message.innerHTML =
`スタンプゲット！<br>` +
`<span style="font-size:0.65em">` +
`あと ${remaining} 個` +
`</span>`;


message.classList.remove(
"show"
);


void message.offsetWidth;


message.classList.add(
"show"
);


setTimeout(
() => {

message.classList.remove(
"show"
);

},

2000
);

}


/* ========================================
通常紙吹雪
======================================== */

function showConfetti() {

const colors = [
"#f08f86",
"#f3bf66",
"#90be78",
"#00a0a8",
"#6f88b9",
"#cf7d9e"
];

/*デフォルトの色*/
/*const colors = [
"#ff5a5f",
"#ffd166",
"#06d6a0",
"#118ab2",
"#9b5de5",
"#f15bb5"
];*/


for (
let i = 0;
i < 100;
i++
) {

const confetti =
document.createElement("div");

confetti.className =
"confetti";


const size =
6 +
Math.random() * 8;


confetti.style.width =
`${size}px`;

confetti.style.height =
`${size * 0.6}px`;

confetti.style.left =
`${Math.random() * 100}vw`;

confetti.style.background =
colors[
Math.floor(
Math.random() *
colors.length
)
];


confetti.style.animationDuration =
`${2.3 + Math.random() * 1.5}s`;

confetti.style.animationDelay =
`${Math.random() * 0.4}s`;


document.body.appendChild(
confetti
);


setTimeout(
() => confetti.remove(),
4500
);

}

}


/* ========================================
コンプリート
======================================== */

async function completeSequence() {

/*
* まず9枚完成状態を
* 少し見せる
*/

await wait(250);


/*
* 豪華紙吹雪
*/

showCompleteConfetti();


/* 紙吹雪が始まって少ししてから表示 */
await wait(350);

/* 完成メッセージ */
const message = document.getElementById("stampMessage");

message.innerHTML = "完成！";
message.classList.add("complete", "show");

/* 1.5秒表示 */
await wait(1200);

message.classList.remove("show");

/* フェードアウトを待つ */
await wait(350);

message.classList.remove("show");

/*
* タイトル刻印
*/

await revealText(
document.getElementById(
"completeTitle"
),

"加茂遺跡スタンプラリー",

65
);


await wait(200);


/*
* ゴール時刻
*/

const goalTime =
getGoalTimeText();


await revealText(
document.getElementById(
"goalTime"
),

goalTime,

80
);

vibrate(80);

/*少し余韻を置いて保存ボタンを表示*/
await wait(500);

showSaveImageButton(true);

}


/* ========================================
文字を1文字ずつ刻印
======================================== */

async function revealText(
element,
text,
interval
) {

element.innerHTML = "";

element.style.visibility =
"visible";


const letters = [];


for (
const character of text
) {

const span =
document.createElement("span");

span.className =
"stamp-letter";


/*
* 半角スペースも維持
*/

span.textContent =
character === " "
? "\u00a0"
: character;


element.appendChild(span);

letters.push(span);

}


for (
const letter of letters
) {

letter.classList.add(
"animate"
);

await wait(interval);

}


/*
* 最後の文字の
* アニメーション完了待ち
*/

await wait(320);

}


/* ========================================
ゴール時刻
======================================== */

function getGoalTimeText() {

const stored =
localStorage.getItem(
"goalTime"
);


if (!stored) {
return "";
}


const date =
new Date(stored);


const year =
date.getFullYear();

const month =
String(
date.getMonth() + 1
).padStart(2, "0");

const day =
String(
date.getDate()
).padStart(2, "0");

const hour =
String(
date.getHours()
).padStart(2, "0");

const minute =
String(
date.getMinutes()
).padStart(2, "0");

const second =
String(
date.getSeconds()
).padStart(2, "0");


return (
`${year}.${month}.${day}` +
` ${hour}:${minute}:${second}`
);

}


/* ========================================
完成済み状態
ページ再読み込み時
======================================== */

function showCompletedState() {

const title =
document.getElementById(
"completeTitle"
);

const time =
document.getElementById(
"goalTime"
);


title.textContent =
"加茂遺跡スタンプラリー";

time.textContent =
getGoalTimeText();


title.style.visibility =
"visible";

time.style.visibility =
"visible";

showSaveImageButton(false);

}


/* ========================================
コンプリート紙吹雪
======================================== */

function showCompleteConfetti() {

const colors = [
"#ff5a5f",
"#ffd166",
"#06d6a0",
"#118ab2",
"#9b5de5",
"#f15bb5",
"#ffffff"
];


/*
* 2回に分けて噴射
*/

for (
let wave = 0;
wave < 2;
wave++
) {

setTimeout(
() => {

for (
let side = 0;
side < 2;
side++
) {

for (
let i = 0;
i < 60;
i++
) {

const confetti =
document.createElement(
"div"
);


confetti.style.position =
"fixed";

confetti.style.zIndex =
"24000";

confetti.style.pointerEvents =
"none";


const size =
6 +
Math.random() * 9;


confetti.style.width =
`${size}px`;

confetti.style.height =
`${size * 0.55}px`;


const startX =
side === 0
? 5
: 95;

const startY =
75 +
Math.random() * 15;


confetti.style.left =
`${startX}vw`;

confetti.style.top =
`${startY}vh`;


confetti.style.background =
colors[
Math.floor(
Math.random() *
colors.length
)
];


document.body.appendChild(
confetti
);


const direction =
side === 0
? 1
: -1;


const x =
direction *
(
50 +
Math.random() * 50
);


const y =
-(
40 +
Math.random() * 60
);


const rotation =
Math.random() * 1080;


const animation =
confetti.animate(

[
{
transform:
"translate(0,0) " +
"rotate(0deg)",

opacity: 1
},

{
transform:
`translate(${x}vw, ${y}vh) ` +
`rotate(${rotation}deg)`,

opacity: 0
}
],

{
duration:
2200 +
Math.random() *
1200,

easing:
"cubic-bezier(.15,.7,.35,1)"
}

);


animation.onfinish =
() =>
confetti.remove();

}

}

},

wave * 450
);

}

}


/* ========================================
スタンプ数
======================================== */

function getStampCount() {

let count = 0;


for (
let i = 1;
i <= TOTAL_STAMPS;
i++
) {

if (
localStorage.getItem(
"stamp_" + i
)
) {

count++;

}

}


return count;

}


/* ========================================
リセット
======================================== */

function resetStamps() {

localStorage.clear();

animationRunning = false;


document.getElementById(
"completeTitle"
).style.visibility =
"hidden";


document.getElementById(
"goalTime"
).style.visibility =
"hidden";


document.getElementById(
"completeTitle"
).innerHTML = "";


document.getElementById(
"goalTime"
).innerHTML = "";


render();

hideSaveImageButton();

updateStartDisplay();

}


/* ========================================
カメラ説明
======================================== */

function showCameraGuide() {

document.getElementById(
"cameraGuide"
).style.display =
"flex";

}


function closeCameraGuide() {

document.getElementById(
"cameraGuide"
).style.display =
"none";

}


/* ========================================
カメラ起動
======================================== */

async function startCamera() {

closeCameraGuide();


try {

cameraStream =
await navigator.mediaDevices
.getUserMedia({

video: {
facingMode: {
ideal:
"environment"
}
},

audio: false

});


const video =
document.getElementById(
"cameraVideo"
);


video.srcObject =
cameraStream;


document.getElementById(
"cameraArea"
).style.display =
"flex";


} catch (error) {

console.error(error);


alert(
"カメラを使用できませんでした。\n" +
"カメラの使用を許可して、" +
"もう一度お試しください。"
);

}

}


/* ========================================
カメラ終了
======================================== */

function stopCamera() {

if (cameraStream) {

cameraStream
.getTracks()
.forEach(
track =>
track.stop()
);


cameraStream = null;

}


const video =
document.getElementById(
"cameraVideo"
);


video.srcObject = null;


document.getElementById(
"cameraArea"
).style.display =
"none";

}


/* ========================================
待機
======================================== */

function wait(ms) {

return new Promise(
resolve =>
setTimeout(
resolve,
ms
)
);

}


/* ========================================
振動
対応端末のみ実行
======================================== */

function vibrate(duration = 50) {

if ("vibrate" in navigator) {
navigator.vibrate(duration);
}

}


/* ========================================
完成記念画像の保存
======================================== */

function showSaveImageButton(animated = true) {

const button =
document.getElementById("saveImageButton");

if (!button) return;

button.classList.add("visible");

if (animated) {
requestAnimationFrame(() => {
requestAnimationFrame(() => {
button.classList.add("appear");
});
});
} else {
button.classList.add("appear");
}
}


function hideSaveImageButton() {

const button =
document.getElementById("saveImageButton");

if (!button) return;

button.classList.remove("appear", "visible");
}


/* 画像読み込み */
function loadImage(src) {

return new Promise((resolve, reject) => {

const img = new Image();

img.onload = () => resolve(img);
img.onerror = () => reject(
new Error("画像を読み込めません: " + src)
);

img.src = src;
});
}


/* Canvas上で文字を中央揃え */
function drawCenteredText(ctx, text, x, y, maxWidth) {

ctx.textAlign = "center";
ctx.textBaseline = "middle";

ctx.fillText(text, x, y, maxWidth);
}


/* 完成画像を生成 */
async function createCompletedImage() {

if (getStampCount() !== 9) {
throw new Error("スタンプが完成していません");
}

const size = 1200;
const cellSize = size / 3;

const canvas = document.createElement("canvas");

canvas.width = size;
canvas.height = size;

const ctx = canvas.getContext("2d");

if (!ctx) {
throw new Error("画像を生成できません");
}

/* 背景 */
ctx.fillStyle = "#f3ead7";
ctx.fillRect(0, 0, size, size);


/* 9枚のスタンプを合成 */
const images = await Promise.all(
Array.from(
{ length: 9 },
(_, i) => loadImage(`images/img_${i + 1}.jpg`)
)
);

images.forEach((img, index) => {

const col = index % 3;
const row = Math.floor(index / 3);

ctx.drawImage(
img,
col * cellSize,
row * cellSize,
cellSize,
cellSize
);

});


/* Webフォントの読み込み */
await Promise.all([
document.fonts.load('700 64px "MPLUS Rounded"'),
document.fonts.load('400 40px "MPLUS"')
]);


/* タイトル */
ctx.font = '700 64px "MPLUS Rounded"';
ctx.fillStyle = "#493126";

drawCenteredText(
ctx,
"加茂遺跡スタンプラリー",
size / 2,
size * 0.05,
size * 0.94
);


/* ゴール時刻 */
ctx.font = '400 40px "MPLUS"';
ctx.fillStyle = "#493126";

drawCenteredText(
ctx,
getGoalTimeText(),
size / 2,
size * 0.965,
size * 0.94
);


/* JPEGに変換 */
return new Promise((resolve, reject) => {

canvas.toBlob(
blob => {
if (blob) {
resolve(blob);
} else {
reject(new Error("JPEGの生成に失敗しました"));
}
},
"image/jpeg",
0.92
);

});
}


/* 保存ボタンを押したとき */
async function saveCompletedImage() {

const button =
document.getElementById("saveImageButton");

button.disabled = true;

try {

const blob = await createCompletedImage();

const date = new Date(
localStorage.getItem("goalTime")
);

const pad = n => String(n).padStart(2, "0");

const dateText = isNaN(date.getTime())
? "completed"
: (
date.getFullYear() +
pad(date.getMonth() + 1) +
pad(date.getDate()) + "-" +
pad(date.getHours()) +
pad(date.getMinutes()) +
pad(date.getSeconds())
);

const filename =
`kamo-stamp-${dateText}.jpg`;

const file = new File(
[blob],
filename,
{ type: "image/jpeg" }
);


/* iPhoneなど、共有機能が使える場合 */
const isIOS =
/iPhone|iPad|iPod/.test(navigator.userAgent);

if (
isIOS &&
navigator.canShare &&
navigator.canShare({ files: [file] }) &&
navigator.share
) {

try {

await navigator.share({
files: [file]
});

return;

} catch (error) {

/* キャンセルした場合 */
if (error.name === "AbortError") {
return;
}

/* 共有できなければプレビューへ */
}

}


/* iPhoneでは画像を表示 */
if (isIOS) {

showSaveImageModal(blob);
return;

}


/* Android・PCではダウンロード */
const url = URL.createObjectURL(blob);

const a = document.createElement("a");

a.href = url;
a.download = filename;

document.body.appendChild(a);
a.click();
a.remove();

setTimeout(() => {
URL.revokeObjectURL(url);
}, 60000);

} catch (error) {

console.error(error);

alert(
"画像を保存できませんでした。\n" +
"もう一度お試しください。"
);

} finally {

button.disabled = false;

}

}


/* 保存画像を表示 */
let savePreviewURL = null;

function showSaveImageModal(blob) {

closeSaveImageModal();

savePreviewURL = URL.createObjectURL(blob);

document.getElementById("savedImagePreview").src =
savePreviewURL;

document.getElementById("saveImageModal").hidden = false;

}


function closeSaveImageModal() {

const modal =
document.getElementById("saveImageModal");

const preview =
document.getElementById("savedImagePreview");

if (modal) modal.hidden = true;
if (preview) preview.removeAttribute("src");

if (savePreviewURL) {
URL.revokeObjectURL(savePreviewURL);
savePreviewURL = null;
}

}


// JavaScript Document