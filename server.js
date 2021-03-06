// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);
const port = process.env.PORT || 3000;

var cards = require('./static/cards.js');

app.set('port', port);
app.use('/static', express.static(__dirname + '/static'));

// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(port, function() {
  console.log('Starting server on port '+port);
});

var players = {};
var playerList = [];
var noPlayers = 0;
const playersMax = 10;

var winningPoints = 5;

var whiteQueue = [];
var whitei = 0;
var whitePerPerson = 10;

var blackQueue = [];
var blacki = 0;

var cardsPlayed = [];
var cardsPlayedi = 0;

var tzarTag = 0;
var tzarID;

var acceptCards = false;
var acceptTzar = false;

var gameStarted = false;
var prevBlack;

var customCard = "";

var mostpickedcards = [];

io.on('connection', (client) => {
  client.on('disconnect', function() {
    for (let id in playerList) {
      if (playerList[id]==client.id) {
           // remove commited cards of that person
           for (let id2 in cardsPlayed){
               if (cardsPlayed[id2].player==client.id) {
                   cardsPlayed.splice(id2, 1);
                   cardsPlayedi--;
               }
           }

        if (players[playerList[id]].tzar==true) {
        // appoint new tzar
            tzarTag++;
            if (tzarTag>=playerList.length) tzarTag=0;
            players[playerList[tzarTag]].tzar=true;
            players[playerList[tzarTag]].pick=false;
            players[playerList[tzarTag]].amountPicked=0;
            if (acceptCards==true) io.sockets.emit('blockTzar', players[playerList[tzarTag]].id);
        // remove played cards of new tzar
            for (let id2 in cardsPlayed){
                     if (cardsPlayed[id2].player==players[playerList[tzarTag]].id) {
                         cardsPlayed.splice(id2, 1);
                         cardsPlayedi--;
                     }
            }
            emitEmptyWhite();
        }
        if ((noPlayers-1<=cardsPlayed.length && prevBlack.type==0) || ((prevBlack.type*(noPlayers-1))<=cardsPlayed.length && (prevBlack.type==2 || prevBlack.type==3))) {
            acceptCards=false;
            acceptTzar=true;
        }
        if (acceptTzar==true) {
            shufflePlayed();
            players[playerList[tzarTag]].pick=true;
            io.sockets.emit('playedCards', cardsPlayed, prevBlack.type);
            io.sockets.emit('enableCards');
            io.sockets.emit('tzarTurn', players[playerList[tzarTag]]);
        }

        playerList.splice(id, 1);
        noPlayers--;

        tzarTag--;
        if (tzarTag<0) tzarTag=playerList.length-1;

        io.sockets.emit('state', playerList, players);
        break;
      }
    }
      let playername = "user";
      if (players[client.id]!=undefined) playername=players[client.id].name;
      let date = new Date();
        let input = {
          date: "["+String(date.getHours()).padStart(2,"0")+":"
          +String(date.getMinutes()).padStart(2,"0")+":"
          +String(date.getSeconds()).padStart(2,"0")+"]",
          author: "server",
          sauce: playername+" disconnected from the server "+"["+client.id+"]"
        }
        io.sockets.emit('message', input);
        io.sockets.emit('state', playerList, players);
        console.log('user disconnected', playerList);
        if (noPlayers==0) {
            gameStarted=false;
        }
  });
  client.on('new player', function(nickname) {
    io.sockets.emit('sessionid', client.id);
    noPlayers++;
    playerList.push(client.id);
    players[client.id] = {
      id: client.id,
      name: nickname,
      points: 0,
      tzar: false,
      played: false,
      tag: noPlayers,
      pick: false,
      amountPicked: 0,
      rerolled: false,
      voted: false
    };
    //console.log(players[socket.id].name, socket.id);
    console.log(playerList);
    let date = new Date();
    let input = {
      date: "["+String(date.getHours()).padStart(2,"0")+":"
      +String(date.getMinutes()).padStart(2,"0")+":"
      +String(date.getSeconds()).padStart(2,"0")+"]",
      author: nickname,
      sauce: "joins the lobby"
    }
    io.sockets.emit('message', input);
    io.sockets.emit('state', playerList, players);
    if (gameStarted==true){
           for (let i=0;i<whitePerPerson;i++){
                console.log("white sent: ", client.id, whiteQueue[0].matchid, cards.white[whiteQueue[0].cardid].text );
                io.sockets.emit('recieveWhite', client.id, whiteQueue[0], cards.white[whiteQueue[0].cardid]);
                whiteQueue.shift();
           }
           io.sockets.emit('blackCard', prevBlack);
           if (acceptCards==true) {
               players[client.id].pick=true;
               emitEmptyWhite();
           }
           if (acceptTzar==true) {
                //io.sockets.emit('enableCards');
                //io.sockets.emit('tzarTurn', players[playerList[tzarTag]]);
           }
    }
    io.sockets.emit('state', playerList, players);
    for (var id in players) {
    //  console.log(id);
    }
  });
  client.on('updateName', function(nickname) {
      if (players[client.id]!=undefined) players[client.id].name = nickname;
      console.log(playerList);
      let date = new Date();
      let input = {
        date: "["+String(date.getHours()).padStart(2,"0")+":"
        +String(date.getMinutes()).padStart(2,"0")+":"
        +String(date.getSeconds()).padStart(2,"0")+"]",
        author: nickname,
        sauce: "is in the game"
      }
      io.sockets.emit('message', input);
      io.sockets.emit('state', playerList, players);
    });
  client.on('setPoints', function(number){
    if(number=="Points to win") return;
    winningPoints=number;
    console.log("Points to win set: ", winningPoints);
    io.sockets.emit('pointsToWin', winningPoints);
    io.sockets.emit('state', playerList, players);
  });
  client.on('reroll', function(){
    if(players[client.id].reroll) return;
    if(players[client.id].tzar || acceptTzar) return;
    if(!gameStarted) return;
    players[client.id].reroll = true;

    io.sockets.emit('deleteWhite', client.id);
    for (let i=0;i<whitePerPerson;i++){
        console.log("white sent: ", client.id, whiteQueue[0].matchid, cards.white[whiteQueue[0].cardid].text);
        io.sockets.emit('recieveWhite', client.id, whiteQueue[0], cards.white[whiteQueue[0].cardid]);
        whiteQueue.shift();
    }

    let date = new Date();
    let message = {
    date: "["+String(date.getHours()).padStart(2,"0")+":"
           +String(date.getMinutes()).padStart(2,"0")+":"
           +String(date.getSeconds()).padStart(2,"0")+"]",
    author: "server",
    sauce: players[client.id].name+" rerolled their cards"
    }
    io.sockets.emit('message', message);
  });
  client.on('vote', function(){
    if(players[client.id].voted) return;
    if(!gameStarted || !acceptTzar) return;
    players[client.id].voted = true;

    let date = new Date();
    let message = {
    date: "["+String(date.getHours()).padStart(2,"0")+":"
           +String(date.getMinutes()).padStart(2,"0")+":"
           +String(date.getSeconds()).padStart(2,"0")+"]",
    author: "server",
    sauce: players[client.id].name+" voted to give everyone a point"
    }
    io.sockets.emit('message', message);

    let votes=true;
    for (let id in playerList){
        if (!players[playerList[id]].voted) {
            votes=false;
            break;
        }
    }
    if (!votes) return;
    acceptTzar=false;

    message = {
                date: "["+String(date.getHours()).padStart(2,"0")+":"
                +String(date.getMinutes()).padStart(2,"0")+":"
                +String(date.getSeconds()).padStart(2,"0")+"]",
                author: "server",
                sauce: "Everybody wins! Next round starting in 5s..."
              }
    io.sockets.emit('message', message);
    let winner=false;
    for (let id in playerList){
        if (!players[playerList[id]].tzar) players[playerList[id]].points++;
        if (players[playerList[id]].points>=winningPoints) {
              message = {
                date: "["+String(date.getHours()).padStart(2,"0")+":"
                +String(date.getMinutes()).padStart(2,"0")+":"
                +String(date.getSeconds()).padStart(2,"0")+"]",
                author: players[playerList[id]].name,
                sauce: "wins!"
              }
              io.sockets.emit('message', message);
              gameStarted=false;
              io.sockets.emit('startEnable');
              winner=true;
            }
    }
    io.sockets.emit('state', playerList, players);
    if (!winner) setUpTurn();
  });
  client.on('cardCommited', function(matchCardID, cardID) { // matchCardID
      // emit to client card disabling signal
      if (acceptCards==false || players[client.id].pick==false) return;
      players[client.id].amountPicked++;
      if (prevBlack.type==0){
              players[client.id].played=true;
              players[client.id].pick=false;
              io.sockets.emit('playedCardsHidden');
              io.sockets.emit('state', playerList, players);
              io.sockets.emit('recieveWhite', client.id, whiteQueue[0], cards.white[whiteQueue[0].cardid]);
              io.sockets.emit('disableCards', client.id);
              whiteQueue.shift();
              cardsPlayed[cardsPlayedi++] = {
                player: client.id,
                matchid: matchCardID,
                card: cards.white[cardID]
              }
              console.log(cardsPlayedi, cardsPlayed, cardID);
              if (cardsPlayedi>=noPlayers-1){
                acceptCards=false;
                acceptTzar=true;
                players[playerList[tzarTag]].pick=true;
                console.log("Tzar turn", tzarTag);
                shufflePlayed();
                io.sockets.emit('playedCards', cardsPlayed, prevBlack.type);
                io.sockets.emit('state', playerList, players);
                io.sockets.emit('enableCards');
                io.sockets.emit('tzarTurn', players[playerList[tzarTag]]);
              }
      }
      else if (prevBlack.type==2 || prevBlack.type==3){
      io.sockets.emit('updateWhite', client.id);
        cardsPlayed[cardsPlayedi++] = {
                   player: client.id,
                   matchid: matchCardID,
                   card: cards.white[cardID]
        }
        if (players[client.id].amountPicked==prevBlack.type){
               players[client.id].played=true;
               players[client.id].pick=false;
                 io.sockets.emit('state', playerList, players);
                 io.sockets.emit('playedCardsHidden');
                 for (let i=0;i<prevBlack.type;i++){
                        io.sockets.emit('recieveWhite', client.id, whiteQueue[0], cards.white[whiteQueue[0].cardid]);
                        whiteQueue.shift();
                 }
                 io.sockets.emit('disableCards', client.id);

                 console.log(cardsPlayedi, cardsPlayed, cardID);
                 if (cardsPlayedi>=((noPlayers-1)*prevBlack.type)){
                   acceptCards=false;
                   acceptTzar=true;
                   players[playerList[tzarTag]].pick=true;
                   console.log("Tzar turn", tzarTag);
                   //shufflePlayed();
                   io.sockets.emit('playedCards', cardsPlayed, prevBlack.type);
                   io.sockets.emit('state', playerList, players);
                   io.sockets.emit('enableCards');
                   io.sockets.emit('tzarTurn', players[playerList[tzarTag]]);
                 }
        }
      }
  });
  client.on('tzarPicked', function(cardID) {
      if (acceptTzar==false || players[client.id].tzar==false) return;
      acceptTzar=false;
      for (let id in cardsPlayed) {
        if (cardsPlayed[id].matchid==cardID) {
          if (players[cardsPlayed[id].player]!=undefined) players[cardsPlayed[id].player].points++;
          mostpickedcards.push(cardsPlayed[id].card.id);
          io.sockets.emit('highlightCard', cardID, players);
          io.sockets.emit('state', playerList, players);
          let date = new Date();
          let input = {
            date: "["+String(date.getHours()).padStart(2,"0")+":"
            +String(date.getMinutes()).padStart(2,"0")+":"
            +String(date.getSeconds()).padStart(2,"0")+"]",
            author: players[cardsPlayed[id].player].name,
            sauce: "wins this round with: "+cardsPlayed[id].card.text+"; Next round starting in 5s..."
          }
          io.sockets.emit('message', input);
        }
        if (players[cardsPlayed[id].player].points>=winningPoints) {
          let date = new Date();
          let input = {
            date: "["+String(date.getHours()).padStart(2,"0")+":"
            +String(date.getMinutes()).padStart(2,"0")+":"
            +String(date.getSeconds()).padStart(2,"0")+"]",
            author: players[cardsPlayed[id].player].name,
            sauce: "wins!"
          }
          io.sockets.emit('message', input);
          gameStarted=false;
          io.sockets.emit('startEnable');
          return;
        }
      }
      setUpTurn();
  });
  client.on('start', function() {
      gameStarted = true;
      io.sockets.emit('pointsDisable');
      io.sockets.emit('playedCards', [], 0);
      io.sockets.emit('clearBoard');
      whiteQueue.splice(0, whiteQueue.length);
      blackQueue.splice(0, blackQueue.length);
      cardsPlayed.splice(0, cardsPlayed.length);
      whitei=0;
      cardsPlayedi=0;
      blacki=0;

      for (let i=0;i<noPlayers;i++){
        shuffleBlack();
        shuffleWhite();
      }

      console.log("black card: ", cards.black[blackQueue[0]]);
      acceptCards = true;
      acceptTzar = false;

      for (let id in playerList) {
        for (let i=0;i<whitePerPerson;i++){
          console.log("white sent: ", playerList[id], whiteQueue[0].matchid, cards.white[whiteQueue[0].cardid].text);
          io.sockets.emit('recieveWhite', playerList[id], whiteQueue[0], cards.white[whiteQueue[0].cardid]);
          whiteQueue.shift();
        }
      }

      io.sockets.emit('state', playerList, players);
      io.sockets.emit('blackCard', cards.black[blackQueue[0]]);
      let message = {
        date: '',
        author: "Black card",
        sauce: cards.black[blackQueue[0]].text
      }
      io.sockets.emit('message', message);
      prevBlack = cards.black[blackQueue[0]];
      blackQueue.shift();

      for (let id in players) {
        players[id].points=0;
        players[id].tzar=false;
        players[id].played=false;
        players[id].pick=true;
        players[id].amountPicked=0;
        players[id].reroll=false;
        players[id].voted=false;
      }

      tzarTag=0;
      players[playerList[tzarTag]].tzar=true;
      players[playerList[tzarTag]].pick=false;
      players[playerList[tzarTag]].amountPicked=0;

      io.sockets.emit('state', playerList, players);
      io.sockets.emit('blockTzar', players[playerList[tzarTag]].id);
      io.sockets.emit('startDisable');
      io.sockets.emit('startTurn');
  });
  client.on('message', function(input) {
    console.log(input.date," ",input.author," : ", input.sauce);
    io.sockets.emit('message', input);
    if (input.sauce=="!stats") {
            let message = {
            date: "",
            author: "Most picked cards",
            sauce: countCards()
            }
        io.sockets.emit('message', message);
    }
  });
  client.on('subscribeToTimer', (interval) => {
    console.log('client is subscribing to timer with interval ', interval);
    setInterval(() => {
      client.emit('timer', new Date());
    }, interval);
  });
});

function setUpTurn(){
      setTimeout(function(){
        cardsPlayed.splice(0, cardsPlayed.length);
        cardsPlayedi=0;
        io.sockets.emit('playedCards', [], 0);

        io.sockets.emit('blackCard', cards.black[blackQueue[0]]);
        let message = {
          date: '',
          author: "Black card",
          sauce: cards.black[blackQueue[0]].text
        }
        io.sockets.emit('message', message);
        
        prevBlack = cards.black[blackQueue[0]];
        blackQueue.shift();

        acceptCards=true;
        acceptTzar=false;
        for (let id in players){
          players[id].tzar=false;
          players[id].played=false;
          players[id].pick=true;
          players[id].amountPicked=0;
          players[id].voted=false;
        }
        tzarTag++;
        if (tzarTag>=playerList.length) tzarTag=0;
        players[playerList[tzarTag]].tzar=true;
        players[playerList[tzarTag]].pick=false;
        players[playerList[tzarTag]].amountPicked=0;
        io.sockets.emit('state', playerList, players);
        console.log(players);
        acceptCards=true;
        io.sockets.emit('enableCards');
        io.sockets.emit('blockTzar', players[playerList[tzarTag]].id);
      }, 5000)
}

function shuffleWhite(){
    let nums = [];
    for (let k=0;k<cards.white.length;k++){
      nums[k]=k;
    }
    let i = cards.white.length;
    let j = 0;

  while (i--) {
      j = Math.floor(Math.random() * (i+1));
      whiteQueue.push({
        cardid: nums[j],
        matchid: whitei++
      });
      nums.splice(j,1);
  }
}

function shuffleBlack(){
    let nums = [];
    for (let k=0;k<cards.black.length;k++){
      nums[k]=k;
    }
    let i = cards.black.length;
    let j = 0;

  while (i--) {
      j = Math.floor(Math.random() * (i+1));
      blackQueue.push(nums[j]);
      nums.splice(j,1);
  }
  console.log(blackQueue);
}

function shufflePlayed(){
    let nums = [];
    for (let k=0;k<cardsPlayed.length;k++){
      nums[k]=k;
    }
    let i = cardsPlayed.length;
    let j = 0;
    let playedQueue = [];

  while (i--) {
      j = Math.floor(Math.random() * (i+1));
      playedQueue.push(cardsPlayed[j]);
      cardsPlayed.splice(j,1);
  }
  cardsPlayed = playedQueue;
}

function countCards(){
    let curr = 0;
    let index = [];
    for (let i=0;i<mostpickedcards.length;i++){
        curr++;
        if (mostpickedcards.length-1==i || mostpickedcards[i]!=mostpickedcards[i+1]) {
            index.push({cardid: mostpickedcards[i], amount: curr});
            curr=0;
        }
    }

    insertionSort(index);
    console.log(index);
    let response;
    if (index[index.length-1]!=undefined) response="<br>"+cards.white[index[index.length-1].cardid].text+" - "+index[index.length-1].amount+"<br>";
    if (index[index.length-2]!=undefined) response=response+cards.white[index[index.length-2].cardid].text+" - "+index[index.length-2].amount+"<br>";
    if (index[index.length-3]!=undefined) response=response+cards.white[index[index.length-3].cardid].text+" - "+index[index.length-3].amount;
    return response;
}

function insertionSort(inputArr) {
    let n = inputArr.length;
        for (let i = 1; i < n; i++) {
            let current = inputArr[i];
            let j = i-1;
            while ((j > -1) && (current.amount < inputArr[j].amount)) {
                inputArr[j+1] = inputArr[j];
                j--;
            }
            inputArr[j+1] = current;
        }
    return inputArr;
}

function emitEmptyWhite(){
                          io.sockets.emit('playedCards', [], 0);
                           if (prevBlack.type==0) {
                                      for (let i=0;i<cardsPlayed.length;i++){
                                           io.sockets.emit('playedCardsHidden');
                                      }
                           }
                           else if (prevBlack.type==2 || prevBlack.type==3){
                                        for (let i=0;i<cardsPlayed.length/prevBlack.type;i++){
                                            io.sockets.emit('playedCardsHidden');
                                        }
                           }
}

function unpack(){
    for (let id in cards.black){
        console.log(cards.black[id].text)
    }

}

/*
setInterval(function() {
  io.sockets.emit('state', playerList, players);
}, 5000);*/

