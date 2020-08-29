var socket = io();
var nickname = "unknown";
var socketid = "not";

var whiteCards = [];
var allCards = [];

var acceptCards = false;

window.onload = function() {
    socket.emit('new player', nickname);
    nickname = prompt("Please enter your nickname");
    socket.emit('updateName', nickname);
};

window.onbeforeunload = closingCode;
function closingCode(){
  var date = new Date();
  var input = {
    date: "["+String(date.getHours()).padStart(2,"0")+":"
    +String(date.getMinutes()).padStart(2,"0")+":"
    +String(date.getSeconds()).padStart(2,"0")+"]",
    author: nickname,
    sauce: "leaves the game"
  }
  socket.emit('message', input);
  socket.emit('leaverTrigger');
   return null;
}

function updateScroll(){
    var element = document.getElementById("chatLog");
    element.scrollTop = element.scrollHeight;
}

function startGame(){
  socket.emit('start');
}

function tzarPicked(cardid){
  socket.emit('tzarPicked', cardid);
}

function cardCommited(cardid, cardSauceid){
  if (!acceptCards) return;
  acceptCards=false;
  for (let i in whiteCards){
    if (cardid==whiteCards[i].card.matchid) whiteCards.splice(i, 1);
  }
  socket.emit('cardCommited', cardid, cardSauceid);
}

var enterPress = document.getElementById('chatInput');
document.addEventListener('keydown', logKey);
function logKey(e) {
  if(e.keyCode==13) {
    writeMessage();
  }
}

function updateScroll(){
    var element = document.getElementById("chatLog");
    element.scrollTop = element.scrollHeight;
}

socket.on('sessionid', function(id){
  if (socketid!="not") return;
  socketid=id;

   let msg = document.createElement("p");
   msg.className="text-light";
   msg.innerHTML = "["+socketid+"]";
   document.getElementById("player").appendChild(msg);
})
function setPoints(){
  let number = document.getElementById("pointsInput").value;
  socket.emit('setPoints', number);
}
socket.on('pointsToWin', function(number) {
  document.getElementById("pointsInput").value = number;
});
socket.on('pointsDisable', function() {
  document.getElementById("pointsButton").disabled=true;
});
socket.on('startDisable', function() {
  document.getElementById("startButton").disabled=true;
});
socket.on('startEnable', function() {
  document.getElementById("startButton").disabled=false;
});
socket.on('message', function(message) {
  displayMessage(message);
});
socket.on('playedCards', function(playedCards) {
  allCards = playedCards;

  let node = document.getElementById('cards');
  node.innerHTML = "";

  for (let id in playedCards){
    let msg = document.createElement("div");
    msg.className="btn-light border border-dark biggerCard";
    msg.setAttribute("style", "border-radius: 1rem;")
    msg.setAttribute("onClick", "tzarPicked("+playedCards[id].matchid+")");

    if (playedCards[id].card.type==0){
      msg.innerHTML = playedCards[id].card.text;//+" ["+playedCards[id].matchid+"]";
    } else if (playedCards[id].card.type==1){
      msg.className="border border-dark biggerCard";
      msg.setAttribute("style", "border-radius: 1rem; background-image: url(\""+playedCards[id].card.text+"\");")
    }

    document.getElementById("cards").appendChild(msg);
  }
});
socket.on('playedCardsHidden', function() {
    let msg = document.createElement("div");
    msg.className="btn-light border border-dark biggerCard";
    msg.setAttribute("style", "border-radius: 1rem;")

    document.getElementById("cards").appendChild(msg);
});
socket.on('tzarTurn', function(tzar) {
       let info = document.createElement("p");
       info.className="h2 text-white";
       info.setAttribute("style", "z-index: 10001;")
       if (tzar.id==socketid) {
           // you are the tzar
           info.innerHTML = "You are the tzar, pick a card";
       } else {
           // your are not the tzar
           info.innerHTML = "Tzar is picking a card";
       }

       let msg = document.createElement("div");
       msg.setAttribute("style", "z-index: 10000; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;")
       msg.appendChild(info);
       msg.id = "blocker"
       document.getElementById("yourCards").appendChild(msg);
   });
socket.on('blockTzar', function(tzarid) {
     if (tzarid!=socketid) return;
     let info = document.createElement("p");
     info.className="h2 text-white";
     info.setAttribute("style", "z-index: 10001;")

     info.innerHTML = "You are the tzar";

     let msg = document.createElement("div");
     msg.setAttribute("style", "z-index: 10000; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;")
     msg.appendChild(info);
     msg.id = "blocker"
     document.getElementById("yourCards").appendChild(msg);
});
socket.on('enableCards', function() {
    let node = document.getElementById('blocker');
    node.parentNode.removeChild(node);
});
socket.on('cardPodiumAndPoints', function() {
  let node = document.getElementById('cards');
  node.innerHTML = "";
});
socket.on('recieveWhite', function(id, card, cardSauce) {
  if (socketid!=id) return;
  whiteCards.push({
    card: card,
    sauce: cardSauce
  });
  var message = {
    date: '',
    author: "white card",
    sauce: "["+card.matchid+"] "+cardSauce.text
  }
  displayMessage(message);

  let node = document.getElementById('yourCards');
  node.innerHTML = "";

  for (let id in whiteCards){
    let p = whiteCards[id];

    let msg = document.createElement("div");
    msg.className="btn-light border border-dark card";
    msg.setAttribute("style", "border-radius: 0.5rem;")
    msg.setAttribute("onClick", "cardCommited("+p.card.matchid+", "+p.sauce.id+")");

    if (p.sauce.type==0){
      msg.innerHTML = p.sauce.text+" ["+p.card.matchid+"]";
    } else if (p.sauce.type==1){
      msg.className="border border-dark card";
      msg.setAttribute("style", "border-radius: 1rem; background-image: url(\""+p.sauce.text+"\");")
    }
    document.getElementById("yourCards").appendChild(msg);
  }
});
socket.on('clearBoard', function(){
  var node = document.getElementById('yourCards');
  node.innerHTML = "";
  whiteCards.splice(0, whiteCards.length);
});
socket.on('blackCard', function(card) {
  //console.log(card.text);
  var message = {
    date: '',
    author: "server",
    sauce: card.text
  }

  var node = document.getElementById('blackCard');
  node.innerHTML = "";

  let msg = document.createElement("p");
  msg.className = "bg-dark text-white border border-white biggerCard";
  msg.setAttribute("style", "border-radius: 1rem;")
  msg.innerHTML = card.text;
  document.getElementById("blackCard").appendChild(msg);
});
socket.on('highlightCard', function(cardid, players){
  let node = document.getElementById('cards');
  node.innerHTML = "";
  for (let id in allCards){
    let msg = document.createElement("div");
    msg.className="btn-light border border-dark biggerCard";
    msg.setAttribute("style", "border-radius: 1rem; opacity: 0.5;")
    msg.setAttribute("onClick", "tzarPicked("+allCards[id].matchid+")");
      if (allCards[id].card.type==0){
        if (allCards[id].matchid==cardid) msg.setAttribute("style", "border-radius: 1rem;")
        msg.innerHTML = allCards[id].card.text+" ["+players[allCards[id].player].name+"]";
      } else if (allCards[id].card.type==1){
        msg.className="border border-dark biggerCard";
        if (allCards[id].matchid==cardid) msg.setAttribute("style", "border-radius: 1rem; background-image: url(\""+allCards[id].card.text+"\");")
        else msg.setAttribute("style", "border-radius: 1rem; opacity: 0.5; background-image: url(\""+allCards[id].card.text+"\");")
      }
      document.getElementById("cards").appendChild(msg);
  }
});
socket.on('state', function(playerList, players) {
  var node = document.getElementById('scoreboard');
  node.innerHTML = "";

  for (let id in playerList){
    let p = players[playerList[id]];
    let status = "";
    let name = p.name;
    if (p.id==socketid) {
        acceptCards=p.pick;
        name+=" (you)";
    }
    if (p.tzar) status="tzar";
    else if (!p.played) status="playing...";

    let msg = document.createElement("p");
    msg.className = "mb-0";
    msg.innerHTML = "["+playerList[id]+"] "+name+"</br>Points: "+p.points+" "+status+"<hr>";
    document.getElementById("scoreboard").appendChild(msg);
  }
});

socket.on('message2', function(id, message) {
  if (socketid!=id) return;
  displayMessage(message);
});

function writeMessage(){
  var date = new Date();
  var input = {
    date: "["+String(date.getHours()).padStart(2,"0")+":"
    +String(date.getMinutes()).padStart(2,"0")+":"
    +String(date.getSeconds()).padStart(2,"0")+"]",
    author: nickname,
    sauce: document.getElementById("chatInput").value
  }
  socket.emit('message', input);
  document.getElementById("chatInput").value="";
}

function displayMessage(message){
  var msg = document.createElement("p");
  msg.innerHTML = message.date+" "+message.author+": "+message.sauce;
  document.getElementById("chatLog").appendChild(msg);
  updateScroll();
}
