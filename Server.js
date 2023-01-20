const express = require('express');
var favicon = require('serve-favicon');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: ["https://drawingbattles.herokuapp.com/"]
    }, 
    maxHttpBufferSize: 1e8, 
    pingTimeout: 60000
});

app.use(express.static(__dirname + '/Client'))

app.get('/',function(req, res){
    res.sendFile(__dirname+'/Client/index.html')//res.sendFile(path.join(__dirname, '/Client/index.html'));
});
//express.static(path.join(__dirname, '/Client')))

app.use(favicon(__dirname + '/favicon.ico'));

server.listen(process.env.PORT || 3000, function() {
   console.log('listening on *:3000');
});

//var CircularJSON = require('circular-json');
const { v4: uuidv4 } = require('uuid')
const gameLength = 180000

/*const io = require("socket.io")(process.env.PORT || 3000, {
    cors: {
        origin: ["http://localhost:8080","http://192.168.1.152:8080", "https://drawingbattles.herokuapp.com/"]
    }, 
    maxHttpBufferSize: 1e8, 
    pingTimeout: 60000
})*/

function EndGame(roomId){
    let room = CurrentRooms[roomId]
    if (room){
        room.InProgress = "Ending"
        io.sockets.in(roomId).emit("roomUpdate", room)
        var pictureRequests = {};
        for (const playerId in room.Clients){
            pictureRequests[playerId] = 0
        }

        io.sockets.in(roomId).emit("requestImageData")
    } else {
        console.log("ERROR INVALID ROOM ID (EndGame)")
    }
}

const randomWords = ["dog","cat","among us","dragon","knight","elephant","sunflower","giraffe","Ocean","Tree","mountain","fish","airplane"]
function getRandomWord(){
    return randomWords[Math.floor(Math.random() * randomWords.length)];
}
function StartGame(roomId, time){
    let room = CurrentRooms[roomId]
    if (room){
        if (room.InProgress == false || room.InProgress == "Ended"){
            room.InProgress = "voting";
            let randomWords = {[getRandomWord()]:[], [getRandomWord()]:[], [getRandomWord()]:[]}
            while (Object.keys(randomWords).length != 3){
                randomWords = {[getRandomWord()]:[], [getRandomWord()]:[], [getRandomWord()]:[]}
            }
            room.words = randomWords;
            io.sockets.in(roomId).emit("startVote", time)
            //after 15 seconds check if game is still in progress
            const timeoutId = setTimeout(()=>{
                if (room.InProgress != false){
                    room.InProgress = true
                    var maxWord = null
                    var maxVal = -1
                    for (const wordName in room.words){
                        const val = room.words[wordName].length
                        if (val > maxVal){
                            maxVal = val
                            maxWord = wordName
                        }
                    }
                    room.word = maxWord
                    const currentTime = new Date().toUTCString()
                    io.sockets.in(roomId).emit("startGame", maxWord, currentTime, gameLength)
                    const gameTimeoutId = setTimeout(EndGame, gameLength, roomId)
                    CurrentTimeouts[roomId] = gameTimeoutId
                    io.sockets.in(roomId).emit("roomUpdate", room)
                }
            }, 15000)
            console.log(timeoutId)
            CurrentTimeouts[roomId] = timeoutId
        } else {
            console.log("ERROR: trying to start game when room is already in progress")
        }
    } else {
        console.log("ERROR: trying to start a game with invalid room Id")
    }
}

function voteForWord(socket, word){
    const [, roomId] = socket.rooms
    if (roomId){
        const room = CurrentRooms[roomId]
        if (room){
            const playerId = getPlayerId(socket)
            const votesArray = room.words[word]
            if (votesArray){
                //check that he didnt vote before
                for (const words in room.words){
                    let index = room.words[words].indexOf(playerId);
                    if (index !== -1){
                        room.words[words].splice(index, 1)
                    }
                }
                votesArray.push(playerId)

                io.sockets.in(roomId).emit("roomUpdate", room)
            } else {
                console.log("ERROR: votes array does not exist word: " + word)
            }
        } else {
            console.log("ERROR: Could not find room (vote)")
        }
    } else {
        console.log("ERROR: trying to vote when not in a room")
    }
}

function clearVotes(roomId){
    const room = CurrentRooms[roomId]
        if (room){
            console.log(room.Clients)
            for (const [playerId, player] of Object.entries(room.Clients)){
                player.Votes = {}
            }
        } else {
            console.log("ERROR: can't find room")
        }
}
function voteForDrawing(socket, playerIdToVoteFor, vote){
    const [, roomId] = socket.rooms
    if (roomId){
        const room = CurrentRooms[roomId]
        if (room){
            if (room.InProgress == "Ending"){
                //ensure that the player exists
                const playerVotingFor = room.Clients[playerIdToVoteFor]
                if (playerVotingFor){
                    const playerId = getPlayerId(socket)
                    if (playerId != playerIdToVoteFor){
                        playerVotingFor.Votes[playerId] = vote
                    }
                    console.log(playerVotingFor.Votes)
                    //console.log(room)
                } else {
                    console.log("ERROR: Trying to vote for a player that does not exist")
                }
            } else {
                console.log("ERROR: Trying to vote while game is not ending")
            }
        } else {
            console.log("ERROR: Could not find room (vote)2")
        }
    } else {
        console.log("ERROR: trying to vote when not in a room2")
    }
}

var CurrentRooms = {}
var CurrentTimeouts = {}
const maxPlayers = 10;
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function makeRoomCode(){
    let code = "";
    for (var i = 0; i < 5; i++){
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code
}

function RemovePlayerFromRoom(socket, roomId){
    roomId = roomId.toUpperCase()
    console.log(roomId)
    var room = CurrentRooms[roomId]
    const [playerId] = socket.rooms
    if (room){
        const host = room.Clients[playerId].Host
        console.log(room.Clients)
        delete room.Clients[playerId]
        if (Object.keys(room.Clients).length == 0){
            console.log("deleting room as it is empty")
            delete CurrentRooms[roomId]
        } else {
            //transfer host if he was host and left
            if (host){
                let [first] = Object.keys(room.Clients)
                room.Clients[first].Host = true
            }
            if (room.InProgress && Object.keys(room.Clients).length <= 2){
                //abort voting
                room.InProgress = false;
                if (CurrentTimeouts[roomId]){
                    console.log("found a timeout for this room")
                    clearTimeout(CurrentTimeouts[roomId])
                    delete CurrentTimeouts[roomId]
                } else {
                    console.log("ERROR: Expected to find a timeout for this roomId but couldn't fetch")
                }
            }
            room = CurrentRooms[roomId]
            io.sockets.in(roomId).emit("roomUpdate", room)
        }
        console.log(room.Clients, Object.keys(room.Clients).length)
    } else {
        console.log("ERROR: trying to remove player from room that doesn't exist")
    }
}

function getPlayerId(socket){
    if (socket){
        const [first] = socket.rooms
        return first
    }
    console.log("ERROR: trying to get playerId of non existent socket")
}

function AddPlayerToRoom(socket, roomId, nick){
    console.log(roomId)
    socket.join(roomId)
    var room = CurrentRooms[roomId.toUpperCase()]
    const playerId = getPlayerId(socket)
    console.log(room)
    if (room.Clients){
        room.Clients[playerId] = {
            "Nickname":nick,
            "Host":false,
            "Votes":{}
             }
    } else {
        // make new room
        room.InProgress = false
        room.Id = roomId
        room.Clients = {[playerId]:{
            "Nickname":nick,
            "Host":true,
            "Votes":{}
        }}
    }
    room = CurrentRooms[roomId.toUpperCase()]
    io.sockets.in(roomId).emit("roomUpdate", room)
}
//hi
function CreateRoom(socket, nick){
    let roomId = makeRoomCode()
    while (CurrentRooms[roomId]){
        console.log("room already made. Retrying to get new code")
        roomId = makeRoomCode()
    }
    if (socket.rooms.size > 1){
        console.log("ERROR: trying to join a room when already joined 2 rooms")
    } else {
        CurrentRooms[roomId] = {}
        AddPlayerToRoom(socket, roomId, nick)
        socket.emit("join-room-response", roomId.toUpperCase(), CurrentRooms[roomId])
        console.log("this client's rooms")
        console.log(socket.rooms)
        console.log("All Rooms Created")
        console.log(CurrentRooms)
        //console.log(CircularJSON.stringify(CurrentRooms))
        return roomId
    }
}

function JoinRoom(socket, roomId, nick){
    roomId = roomId.toUpperCase()
    if (socket.rooms.size > 1){
        console.log("ERROR: trying to join a room when already joined a room")
        const [, roomJoined] = socket.rooms
        const errorMsg = `ERROR: trying to join a room when already in another room : ${roomJoined}`
        socket.emit("join-room-response", errorMsg)
    } else {
        //lookup room
        var room = CurrentRooms[roomId.toUpperCase()]
        //only if found room, then join
        console.log(CurrentRooms, "room after lookup ", room)
        //if room full then deny
        if (room){
            if (Object.keys(room.Clients).length < 10){
                AddPlayerToRoom(socket, roomId, nick)
                if (Object.keys(room.Clients).length >= 3 && room.InProgress == false){
                    console.log("should be starting game now")
                    let date = new Date().toUTCString()
                    StartGame(roomId, date)
                    io.sockets.in(roomId).emit("roomUpdate", room)
                }
                socket.emit("join-room-response", roomId.toUpperCase(), CurrentRooms[roomId])
            } else {
                const errorMsg = "ERROR: trying to join a room that is full"
                console.log(errorMsg)
                socket.emit("join-room-response", errorMsg)
            }
        } else {
            const errorMsg = "ERROR: trying to join a room that doesn't exist"
            console.log(errorMsg)
            socket.emit("join-room-response", errorMsg)
        }
        console.log("room after joining ", room)
    }
}
io.on("connection", (socket) => {
    console.log(socket.id)
    socket.on("sendImageData", (imageData, width, height) => {
        console.log("imageDATA " + imageData, width);
        const playerId = getPlayerId(socket)
        const [, roomId] = socket.rooms
        var room = CurrentRooms[roomId]
        if (room){
            //room.Clients[playerId].image = {"data":imageData, "width":width}
            //keep trying to push the image until successful
            var sendImageInterval = setInterval(() => {
                if (!room.displayingImage){
                    room.displayingImage = playerId
                    console.log("found a spot in the queue")
                    //send the data then after 14 seconds cancel dispayingImage
                    if (room.Clients[playerId]){
                        io.sockets.in(roomId).emit("recieveImageData", imageData, width, height, room.Clients[playerId].Nickname)
                    }
                    io.sockets.in(roomId).emit("roomUpdate", room)
                    setTimeout(()=>{
                        room.displayingImage = false;
                        //set another timeout in a second to see if any more images are there to be displayed
                        setTimeout(() => {
                            if(!room.displayingImage){
                                //game ended
                                room.InProgress = "Ended"
                                io.sockets.in(roomId).emit("roomUpdate", room)
                                clearVotes(roomId)
                                console.log("GAME ENDED!")
                                //wait 7 seconds then start new game
                                setTimeout(()=>{
                                    if (Object.keys(room.Clients).length >= 3){
                                        console.log("should be restarting game now")
                                        let date = new Date().toUTCString()
                                        StartGame(roomId, date)
                                        io.sockets.in(roomId).emit("roomUpdate", room)
                                    }
                                }, 7000)
                            }
                        }, 1000);
                    },12000)
                    clearInterval(sendImageInterval)
                }
            }, 100);
            CurrentTimeouts[roomId] = sendImageInterval
        } else {
            console.log("ERROR: ROOM NOT FOUND")
        }
        //socket.broadcast.emit("recieveImageData", imageData, width)
    });
    socket.on("disconnecting", (reason) => {
        console.log("Disconnecting because of " + reason)
        //leave joined room
        const [, room] = socket.rooms
        if (room){
            RemovePlayerFromRoom(socket, room)
        }
    })
    socket.on("join-room", (roomId, nickname) => {
        //if no nickname or out of bounds length
        if (!nickname || (nickname.length < 3 || nickname.length > 15)){
            JoinRoom(socket, roomId, "default name")
        } else {
            JoinRoom(socket, roomId, nickname)
        }
    })
    socket.on("create-room", (nickname) => {
        if (!nickname || (nickname.length < 3 || nickname.length > 15)){
            CreateRoom(socket, "default name")
        } else {
            CreateRoom(socket, nickname)
        }
    })
    socket.on("vote", (word) => {
        voteForWord(socket, word)
    })
    socket.on("vote-for-drawing", (playerId, vote)=>{
        voteForDrawing(socket, playerId, vote)
    })
    socket.on("send-message", (message)=>{
        const [, roomName] = socket.rooms
        if (roomName){
            const playerId = getPlayerId(socket)
            const clientNickname = CurrentRooms[roomName].Clients[playerId].Nickname
            io.sockets.in(roomName).emit("recieve-message", `${clientNickname}: ${message}`)
        } else {
            console.log("ERROR: trying to send a message when not in a room")
        }
    })
    //saving session
    socket.on('start-session', function(data) {
        console.log("============start-session event================")
        console.log(data)
        if (data.sessionId == null) {
            var session_id = uuidv4(); //generating the sessions_id and then binding that socket to that sessions 
            socket.join(session_id)
            console.log("joined successfully and uuid: " + session_id)
            socket.emit("set-session-acknowledgement", { sessionId: session_id })
        } else {
            socket.join(data.sessionId)
            console.log("joined successfully and uuid: " + data.sessionId)
            socket.emit("set-session-acknowledgement", { sessionId: data.sessionId })
        }
        socket.leave(socket.id)
        console.log(socket.rooms, socket.rooms.size)
    });
})

console.log("server running")