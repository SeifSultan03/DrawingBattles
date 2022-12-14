import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js"//"socket.io-client"

const socket = io()//"https://drawingbattles.herokuapp.com")

//const sendImageDataButton = document.getElementById("sendImageData")
const resetCanvasButton = document.getElementById("resetCanvas")
const colorButtons = document.getElementsByClassName("colorButtons")
const brushSizeButtons = document.getElementsByClassName("sizeButtons")
const quickPlayButton = document.getElementById("quickPlayButton")
const createRoomButton = document.getElementById("CreateLobbyButton")
const joinRoomButton = document.getElementById("JoinLobbyButton")
const sendMessageButton = document.getElementById("sendMessageButton")
const canvasContainer = document.getElementById("canvasContainer")
const chatText = document.getElementById("chatText")
const roomCode = document.getElementById("roomCode")
const copyCodeButton = document.getElementById("copyCodeButton")
const nickname = document.getElementById("nickname")
const allButtons = document.getElementById("allButtons")
const paintingVoteButtons = document.getElementById("paintingVotingButtons")
const paintingVotingButton = document.getElementsByClassName("paintingVotingButton")

const votes1 = document.getElementById("votes1")
const votes2 = document.getElementById("votes2")
const votes3 = document.getElementById("votes3")
const votingTimer = document.getElementById("timerVoting")

const colors = ["white","rgb(223, 223, 223)"];
const orangeRectangle = document.getElementById("orangeRectangle")
const word1 = document.getElementById("word1")
const word2 = document.getElementById("word2")
const word3 = document.getElementById("word3")
const voteButtons = document.getElementsByClassName("wordVote")
// canvas items
const Canvas = document.getElementById('gameCanvas');
const resizerCanvas = document.getElementById("resizerCanvas")
const resizerCanvasContext = resizerCanvas.getContext("2d")
const Context = Canvas.getContext('2d');
const cursor = document.getElementById("cursor")
//game page items
const playerTag = document.getElementsByClassName("playerTag")[0]
const message = document.getElementsByClassName("message")[2]
const messageJoin = document.getElementsByClassName("join")[0]
const messageleave = document.getElementsByClassName("leave")[0]
const messagesContainer = document.getElementById("messages")
const timer = document.getElementById("timer")
const roomCodeDisplay = document.getElementById("roomCodeDisplay")

const votingContainer = document.getElementById("votingContainer")
const chosenWordContainer = document.getElementById("chosenWordContainer")
const chosenWordHeader = document.getElementById("chosenWordHeader")
//leaderboard items
const firstPlace = document.getElementById("first")
const secondPlace = document.getElementById("second")
const thirdPlace = document.getElementById("third")
const morePlaces = document.getElementsByClassName("more")[0]

var imageData
//event listeners
function DrawOnMouseDown(e){
    UpdateLineWidth()
    if (roomCache && roomCache.InProgress != "Ending"){
        rect = getRect(Canvas)
        Context.strokeStyle = Color;
        Context.lineWidth = lineWidth;
        Context.lineCap = 'round';
        Context.beginPath();
        Context.moveTo(e.pageX - rect.left, e.pageY - rect.top);
        Context.lineTo(e.pageX - rect.left, e.pageY - rect.top);
        Context.stroke();
        imageData = Context.getImageData(0, 0, Canvas.width, Canvas.height)
    }
}

function DrawOnMouseMove(e){
    if (roomCache && roomCache.InProgress != "Ending"){
        rect = getRect(Canvas)
        if (MDown) {
            Context.lineTo(e.pageX - rect.left, e.pageY - rect.top);
            Context.stroke();
            console.log(rect.top, rect.left, Canvas.width, Canvas.height)
            imageData = Context.getImageData(0, 0, Canvas.width, Canvas.height)
        }
    }
    cursor.hidden = false;
    cursor.style.left = (e.pageX - (widthSize* window.innerWidth/1000)/2) + "px";
    cursor.style.top = (e.pageY - (widthSize * window.innerWidth/1000)/2) + "px";
    cursor.width = widthSize * window.innerWidth/1000 * 2.5;
}

function deleteChildren(parent, NumberToKeep){
    while (parent.children.length > NumberToKeep) {
        parent.removeChild(parent.lastElementChild);
    }
}

function getRect(el){
    let info = el.getBoundingClientRect();
    let rect = {
        top: info.top + window.scrollY,
        left: info.left + window.scrollX,
        height: el.offsetHeight,
        width: el.offsetWidth
    }
    return rect;
}

function UpdateLineWidth(){
    lineWidth = widthSize * window.innerWidth/1000;
}

function sendImageDataOnButtonDown(){
    socket.emit("sendImageData", imageData, Canvas.width, Canvas.height);
}

function ResetCanvasOnMouseDown(){
    Context.clearRect(0, 0, Canvas.width, Canvas.height);
    imageData = Context.getImageData(0, 0, Canvas.width, Canvas.height)
}

function CreateRoom(){
    if (nickname.value.length < 3){
        alert("nickname should be at least 3 letters")
    } else {
        DisplayPage(2)
        socket.emit("create-room", nickname.value)
    }
}

function JoinRoom(){
    if (nickname.value.length < 0){
        alert("nickname should be at least 3 letters")
    } else {
        DisplayPage(2)
        socket.emit("join-room", roomCode.value, nickname.value)
    }
}

function QuickPlay(){
    if (nickname.value.length < 3){
        alert("nickname should be at least 3 letters")
    } else {
        DisplayPage(2)
        socket.emit("create-room", nickname.value)
    }
}

function SendMessage(){
    const message = chatText.value
    if (message.length > 0)
        socket.emit("send-message", message)
    chatText.value = ""
}

function UpdateChatBoxFromRoomUpdate(room){
    //iterate over new data and check if theres player that is not in cache (new player joined)
    for (let i = 0; i < Object.keys(room.Clients).length; i++){
        let clientName = Object.keys(room.Clients)[i]
        let clientObj = room.Clients[clientName]
        if (roomCache && !roomCache.Clients[clientName]){
            //this is a new player
            const clone = messageJoin.cloneNode(true)
            const text = `${clientObj.Nickname} has joined the room`
            clone.textContent = text
            clone.style.display = "flex"
            messageleave.parentElement.appendChild(clone)
        }
    }

    //iterate over old data and check if theres player that is not in new data (player left)
    if (roomCache){
        for (let i = 0; i < Object.keys(roomCache.Clients).length; i++){
            let clientName = Object.keys(roomCache.Clients)[i]
            let clientObj = roomCache.Clients[clientName]
            if (!room.Clients[clientName]){
                //this is a player that left
                const clone = messageleave.cloneNode(true)
                const text = `${clientObj.Nickname} has left the room`
                clone.textContent = text
                clone.style.display = "flex"
                messageleave.parentElement.appendChild(clone)
            }
        }
    }
}

function AnimateRectangle(){
    var num = 0;
    orangeRectangle.style.height = `0vh`
    let makeBigger = setInterval(()=>{
        if (num == 50){
            clearInterval(makeBigger)
        }
        num+= 0.5;
        orangeRectangle.style.height = `${num}vh`
    }, 20)
}

function AnimateString(string, element){
    let num=0
    var animatorInterval = setInterval(() => {    
        if (num > string.length){
            clearInterval(animatorInterval)
        } else {
            element.textContent = string.substring(0, num)
            num++;
        }
    }, 40);
}

const waitingFrames = ["Waiting for more players.","Waiting for more players..","Waiting for more players..."]
var frame = 0
const word = document.getElementById("word")
function waitingFunction(){
    word.innerHTML = waitingFrames[frame % 3];
    frame++;
}
var waitingAnimation = setInterval(waitingFunction, 400)

function resetVotingButtonsStyle(){
    for (const vButton of paintingVotingButton){
        vButton.style.border = "white 0.2vw solid"
    }
}
var roomCache;

function ResetLeaderboard(){
    var moreElements = document.getElementsByClassName("more");
    for (const element of moreElements){
        if (!element.hidden){
            element.remove()
        }
    }
}

function CountAndDisplayVotes(clients){
    let sortable = [];
    for (var playerName in clients) {
        //total players - how many voted for - 1 (themselves) 
        //(as default everyone votes 1 point if didn't vote)
        const player = clients[playerName]
        var sum = Object.keys(clients).length - Object.keys(player.Votes).length - 1;
        for (const [, vote] of Object.entries(player.Votes)){
            sum += parseInt(vote);
        }
        sortable.push([player.Nickname, sum]);
    }

    sortable.sort(function(a, b) {
        return b[1] - a[1];
    });

    console.log(sortable)
    firstPlace.textContent = `1. ${sortable[0][0]} - ${sortable[0][1]} points`
    sortable.shift()
    if (sortable.length >= 1){
        secondPlace.textContent = `2. ${sortable[0][0]} - ${sortable[0][1]} points`
    }
    sortable.shift()
    if (sortable.length >= 1){
        thirdPlace.textContent = `3. ${sortable[0][0]} - ${sortable[0][1]} points`
    }
    sortable.shift()
    let num = 4;
    while (sortable.length >= 1){
        const clone = morePlaces.cloneNode(true)
        clone.textContent = `${num}. ${sortable[0][0]} - ${sortable[0][1]} points`
        clone.hidden = false;
        morePlaces.parentElement.appendChild(clone);
        num++;
        sortable.shift()
    }

    DisplayPage(5)
}

function UpdateViewOnRoomUpdate(room){
    console.log("roomUpdate: ", room, Object.keys(room.Clients).length)
    deleteChildren(playerTag.parentElement, 1)
    UpdateChatBoxFromRoomUpdate(room)
    for (let i = 0; i < Object.keys(room.Clients).length; i++){
        let clientName = Object.keys(room.Clients)[i]
        let clientObj = room.Clients[clientName]
        const clone = playerTag.cloneNode(true)
        clone.textContent = clientObj.Nickname
        clone.style.display = "flex"
        clone.style.backgroundColor = colors[i%2]
        if (clientObj.Host){
            // this player is the host
        }
        if (clientName == session_id){
            //this player is themselves
            clone.style.backgroundColor = "yellowgreen"
        }
        playerTag.parentElement.appendChild(clone)
    }
    //view word
    clearInterval(waitingAnimation)
    paintingVoteButtons.style.display = "none";
    allButtons.hidden = false

    if (room.InProgress == false){
        DisplayPage(4)
        waitingAnimation = setInterval(waitingFunction, 400)
        if (roomCache && roomCache.InProgress != false){
            ResetCanvasOnMouseDown()
        }
        clearInterval(UpdateVotingTimer)
        clearInterval(UpdateGameTimer)
    } else if (room.InProgress == "voting"){
        DisplayPage(3)
        for (const all of voteButtons){
            all.style.border = "2px solid #2c3e50"
        }
        votingContainer.hidden = false
        chosenWordContainer.hidden = true
        var random1 = Object.keys(room.words)[0];
        var random2 = Object.keys(room.words)[1];
        var random3 = Object.keys(room.words)[2];
        word1.innerHTML = random1
        word2.innerHTML = random2
        word3.innerHTML = random3
        votes1.innerHTML = room.words[random1].length
        votes2.innerHTML = room.words[random2].length
        votes3.innerHTML = room.words[random3].length
    } else if (room.InProgress == true) {
        
    } else if (room.InProgress == "Ending"){
        paintingVoteButtons.style.display = "flex";
        allButtons.hidden = true
    } else if (room.InProgress == "Ended"){
        CountAndDisplayVotes(room.Clients);
        console.log("YAY GAME ENDED: ", room)
        ResetCanvasOnMouseDown()
    }
    roomCache = room
}

function getRoomCode(){
    const code = roomCodeDisplay.textContent.substring(11, 16)
    return code;
}
async function Resize(){
    UpdateLineWidth()
    var viewport_width = window.innerWidth;
    var viewport_height = window.innerHeight;
    const newWidth = Math.round(Math.max(200, Math.min(viewport_width * 0.6, viewport_height * .875))) 
    const newHeight = Math.round(Math.max(160, Math.min(viewport_width * 0.48, viewport_height * 0.7)))
    const bitmap = await createImageBitmap(Canvas, 0, 0, Canvas.width, Canvas.height, {resizeWidth: newWidth, resizeHeight: newHeight, resizeQuality:"high"})
    canvasContainer.style.maxWidth = newWidth + "px";
    Canvas.width = newWidth
    Canvas.height = newHeight
    Context.drawImage(bitmap, 0, 0)
}

const unnamedColors = {
    "#ff00c3":"Pink",
    "#6c4d00":"Brown"
}
for (const colorButton of colorButtons) {
    const validColorName = unnamedColors[colorButton.textContent]
    if (validColorName){
        colorButton.style.background = `url(./images/cursor${validColorName}2.png) no-repeat`;
    } else {
        colorButton.style.background = `url(./images/cursor${colorButton.textContent}2.png) no-repeat`;
    }
    colorButton.style.backgroundSize = "5vw"
    colorButton.addEventListener("click", function(){
        if (validColorName){
            cursor.src = `./images/cursor${validColorName}2.png`
        } else {
            cursor.src = `./images/cursor${colorButton.textContent}2.png`
        }
        
        Color = colorButton.textContent
    })
}
for (const brushSizeButton of brushSizeButtons) {
    brushSizeButton.addEventListener("click", function(){
        widthSize = brushSizeButton.textContent
    })
}
for (const buttons of voteButtons){
    buttons.onmousedown = function() {
        socket.emit("vote", buttons.textContent)
        for (const all of voteButtons){
            all.style.border = "2px solid #2c3e50"
        }
        buttons.style.border = "2px solid green"
    }
}
for (const vButton of paintingVotingButton){
    vButton.addEventListener("click", ()=>{
        resetVotingButtonsStyle()
        vButton.style.border = "green 0.2vw solid"
        socket.emit("vote-for-drawing", roomCache.displayingImage, vButton.textContent)
    })
}
// Canvas Drawing
var MDown = false;
var Color = 'black';
var widthSize = 4;
var lineWidth = widthSize * window.innerWidth/1000;

var rect = getRect(Canvas)

var onMainPage = true
var onLoadingScreen = false
var onWaitingPage = false
var onGamePage = false

//mainPage = 1
//loadingScreen = 2
//waitingPage = 3
//gamePage = 4
function DisplayPage(pageId){
    console.log("requested to display page: " + pageId)
    for (let i = 1; i < 6; i++) {
        document.getElementById("page" + i).hidden = true;
    }
    document.getElementById("page" + pageId).hidden = false;
    if (pageId == 3){
        document.getElementById("page" + pageId).style.display = "flex"
    } else {
        document.getElementById("page3").style.display = "none"
    }
    switch(pageId) {
        case 1:
            onMainPage = true
            onLoadingScreen = false
            onWaitingPage = false
            onGamePage = false
          break;
        case 2:
            onMainPage = false
            onLoadingScreen = true
            onWaitingPage = false
            onGamePage = false
          break;
        case 3:
            onMainPage = false
            onLoadingScreen = false
            onWaitingPage = true
            onGamePage = false
          break;
        case 4:
            onMainPage = false
            onLoadingScreen = false
            onWaitingPage = false
            onGamePage = true
            //window.scrollTo(0,document.body.scrollHeight * 0.08)
          break;
        default:
          console.log("Unexpected pageId to display (expected 1-4) got: " + pageId)
      }
}

Canvas.onselectstart = function() { return false; };
Canvas.unselectable = "on";
Canvas.style.MozUserSelect = "none";

//connecting events

// game page items
Canvas.onmousedown = DrawOnMouseDown
Canvas.onmousemove = DrawOnMouseMove
Canvas.onmouseleave = function() { cursor.hidden = true}
resetCanvasButton.addEventListener("click", ResetCanvasOnMouseDown)
//sendImageDataButton.addEventListener("click", sendImageDataOnButtonDown)
window.addEventListener('resize', Resize);
window.onmousedown = function() {MDown = true}
window.onmouseup = function() {MDown = false}
sendMessageButton.onmousedown = SendMessage

copyCodeButton.onmousedown = function() {
    copyCodeButton.textContent = "Copied!"
    navigator.clipboard.writeText(getRoomCode());
    setTimeout(() => {
        copyCodeButton.textContent = "Copy Code"
    }, 1000);
}

// main page buttons
quickPlayButton.addEventListener("click", QuickPlay)
joinRoomButton.addEventListener("click", JoinRoom)
createRoomButton.addEventListener("click", CreateRoom)

//recieve events
socket.on("recieveImageData", async (buffer, width, height, nickname) => {
    ResetCanvasOnMouseDown()
    resetVotingButtonsStyle()
    votingContainer.hidden = true
    chosenWordContainer.hidden = false
    DisplayPage(3)
    AnimateString(`${nickname}'s drawing`, chosenWordHeader)
    setTimeout(() => {
        DisplayPage(4)
    }, 4000);
    if (buffer) {
        
        var array = new Uint8ClampedArray(buffer.data);
        
        const wid = Math.sqrt(array.length/3.2)
        console.log(buffer, width * width * 0.8 * 4, "wid: " + wid, " width: " + width)
        const _imageData = new ImageData(array, width, height)
        
        imageData = _imageData
        
        resizerCanvas.width = width
        resizerCanvas.height = height
        resizerCanvasContext.putImageData(_imageData, 0, 0)
        const bitmap = await createImageBitmap(resizerCanvas, 0, 0, width, height, {resizeWidth: Canvas.width, resizeHeight: Canvas.height, resizeQuality:"high"})

        Context.drawImage(bitmap, 0, 0)
    }
})

socket.on("join-room-response", (roomName,room) => {
    if (roomName.length > 5){
        //got error message
        DisplayPage(1)
        alert(roomName)
    } else {
        //got room code
        console.log("recieved room that joined: " + roomName, room);
        //roomCodeDisplay.textContent = `Room Code: ${roomName}`
        roomCodeDisplay.firstChild.nodeValue = `Room Code: ${roomName}`
    }
})

socket.on("roomUpdate", UpdateViewOnRoomUpdate)

var UpdateGameTimer = null;
function startGame(wordName, time, gameLength){
    word.innerHTML = wordName;
    votingContainer.hidden = true
    chosenWordContainer.hidden = false
    AnimateString(`The word to draw is ${wordName}`, chosenWordHeader)
    setTimeout(() => {
        DisplayPage(4)
    }, 4000);
    time = new Date(time)
    UpdateGameTimer = setInterval(()=>{
        const currentTime = new Date(new Date().toUTCString())
        const difference = Math.abs(currentTime - time)
        timer.firstChild.nodeValue = (gameLength - difference)/1000
        if (difference >= gameLength){
            //game is done
            clearInterval(UpdateGameTimer)
        }
    }, 10)
}

const votingTime = 15000
var UpdateVotingTimer = null;
function startVote(time){
    AnimateRectangle()
    votingContainer.hidden = false
    chosenWordContainer.hidden = true
    time = new Date(time)
    UpdateVotingTimer = setInterval(()=>{
        const currentTime = new Date(new Date().toUTCString())
        const difference = Math.abs(currentTime - time)
        votingTimer.firstChild.nodeValue = (votingTime - difference)/1000
        if (difference > votingTime){
            //voting is done
            clearInterval(UpdateVotingTimer)
        }
    }, 10)
}
socket.on("startGame", startGame)
socket.on("startVote", startVote)
socket.on("requestImageData", sendImageDataOnButtonDown)
function DisplayMessage(msg){
    const clone = message.cloneNode(true)
    clone.textContent = msg
    clone.style.display = "flex"
    message.parentElement.appendChild(clone)
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

socket.on("recieve-message", DisplayMessage)
//SAVE SESSION ID

var session_id;
// Get saved data from sessionStorage
const data = sessionStorage.getItem('sessionId');
console.log(data)
if (data == null) {
    session_id = null//when we connect first time 
    socket.emit('start-session', {  sessionId: session_id })
} else {
    session_id = data//when we connect n times 
    socket.emit('start-session', {  sessionId: session_id })
}
            
socket.on("set-session-acknowledgement", function(data) {
    sessionStorage.setItem('sessionId', data.sessionId);
    session_id = data.sessionId
    console.log("set session storage as " + data.sessionId)
})
  
Resize()

//DisplayPage(5)

//work on the gameplay loop