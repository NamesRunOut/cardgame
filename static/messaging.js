var socket = io();
var nickname = "unknown";
var socketid = "not";

var whiteCards = [];
var allCards = [];

var acceptCards = false;
var blackType;

window.onload = function() {
    socket.emit('new player', nickname);
    nickname = prompt("Please enter your nickname");
    socket.emit('updateName', nickname);
    //console.log(nickname);
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
  if (blackType==0) acceptCards=false;
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
  //console.log(id);

   let msg = document.createElement("p");
   msg.className="userid";
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
socket.on('pointsEnable', function() {
  document.getElementById("pointsButton").disabled=false;
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
socket.on('privateMessage', function(id, message) {
  if (id!=socketid) return;
  displayMessage(message);
});
socket.on('updateWhite', function(id){
    if (socketid!=id) return;
    updateWhite();
});

function writeCustom(){
    let text = document.getElementById('customInput').value;
    socket.emit("writeCustom", text);
}
function reroll(){
    socket.emit('reroll');
}
function vote(){
    socket.emit('vote');
}

socket.on('playedCards', function(playedCards, type) {
  allCards = playedCards;

  let node = document.getElementById('cards');
  node.innerHTML = "";

  if (type==0){
      for (let id in playedCards){
        let msg = document.createElement("div");
        msg.className="biggerCard";
        msg.setAttribute("onClick", "tzarPicked("+playedCards[id].matchid+")");
        msg.innerHTML = playedCards[id].card.text;//+" ["+playedCards[id].matchid+"]";
        
        if (playedCards[id].card.type==1){
          msg.setAttribute("style", "background-image: url(\""+playedCards[id].card.text+"\");")
        }

        document.getElementById("cards").appendChild(msg);
      }
  } else if (type==2 || type==3){
        insertionSort(allCards);
        let boxid = 0;
        let box;
        for (let id=0;id<allCards.length;id++){
            if(id==0 || allCards[id].player!=allCards[id-1].player){
                 box = document.createElement("div");
                 box.className="box";
                 box.id=boxid;
                 document.getElementById("cards").appendChild(box);
                 boxid++;
            }
                let msg = document.createElement("div");
                msg.className="biggerCard";
                msg.setAttribute("onClick", "tzarPicked("+playedCards[id].matchid+")");

                if (playedCards[id].card.type==0){
                  msg.innerHTML = playedCards[id].card.text;//+" ["+playedCards[id].matchid+"]";
                } else if (playedCards[id].card.type==1){
                  msg.setAttribute("style", "background-image: url(\""+playedCards[id].card.text+"\");")
                }
                document.getElementById(boxid-1).appendChild(msg);
        }
  }
});
socket.on('playedCardsHidden', function() {
    let msg = document.createElement("div");
    msg.className="biggerCard";

    document.getElementById("cards").appendChild(msg);
});
socket.on('tzarTurn', function(tzar) {
       let info = document.createElement("h2");
       if (tzar.id==socketid) {
           // you are the tzar
           info.innerHTML = "You are the tzar, pick a card";
       } else {
           // your are not the tzar
           info.innerHTML = "Tzar is picking a card";
       }

       let msg = document.createElement("div");
       msg.appendChild(info);
       msg.id = "blocker"
       document.getElementById("yourCards").appendChild(msg);
   });
socket.on('blockTzar', function(tzarid) {
     if (tzarid!=socketid) return;
     let info = document.createElement("h2");

     info.innerHTML = "You are the tzar";

     let msg = document.createElement("div");
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
  let message = {
    date: '',
    author: "white card",
    sauce: "["+card.matchid+"] "+cardSauce.text
  }
  displayMessage(message);

  updateWhite();
});
socket.on('deleteWhite', function(id){
  if(socketid!=id) return;
  let node = document.getElementById('yourCards');
  node.innerHTML = "";
  whiteCards.splice(0, whiteCards.length);
});
socket.on('clearBoard', function(){
  let node = document.getElementById('yourCards');
  node.innerHTML = "";
  whiteCards.splice(0, whiteCards.length);
});
socket.on('blackCard', function(card) {
  blackType = card.type;

  let node = document.getElementById('blackCard');
  node.innerHTML = "";

  let msg = document.createElement("div");
  msg.className = "biggerCard blackCard";
  msg.innerHTML = card.text;
  document.getElementById("blackCard").appendChild(msg);
});
socket.on('highlightCard', function(cardid, players){
  let node = document.getElementById('cards');
  node.innerHTML = "";

  for (let id in allCards){
    let msg = document.createElement("div");
    msg.className="biggerCard";
    msg.setAttribute("style", "opacity: 0.5;")
      if (allCards[id].card.type==0){
        if (allCards[id].matchid==cardid) msg.setAttribute("style", "opacity: 1;")
        msg.innerHTML = allCards[id].card.text+" ["+players[allCards[id].player].name+"]";
      } else if (allCards[id].card.type==1){
        if (allCards[id].matchid==cardid) msg.setAttribute("style", "opacity: 1; background-image: url(\""+allCards[id].card.text+"\");")
        else msg.setAttribute("style", "opacity: 0.5; background-image: url(\""+allCards[id].card.text+"\");")
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

    let msg = document.createElement("div");
    msg.className = "playerScore";
    msg.innerHTML = "<div>"+name+" "+status+"</br>Points: "+p.points+"</div><div style=\"opacity: 0.2\">"+"["+playerList[id]+"]"+"</div>";
    document.getElementById("scoreboard").appendChild(msg);
    document.getElementById("scoreboard").appendChild(document.createElement("hr"));
  }
});

function writeMessage(){
  let date = new Date();
  let input = {
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

function insertionSort(inputArr) {
    let n = inputArr.length;
        for (let i = 1; i < n; i++) {
            let current = inputArr[i];
            let j = i-1;
            while ((j > -1) && (current.player < inputArr[j].player)) {
                inputArr[j+1] = inputArr[j];
                j--;
            }
            inputArr[j+1] = current;
        }
    return inputArr;
}

function updateWhite(){
    let node = document.getElementById('yourCards');
     node.innerHTML = "";

     for (let id in whiteCards){
       let p = whiteCards[id];

       let msg = document.createElement("div");
       msg.className="card";
       msg.setAttribute("onClick", "cardCommited("+p.card.matchid+", "+p.sauce.id+")");

       if (p.sauce.type==0){
         msg.innerHTML = p.sauce.text+" ["+p.card.matchid+"]";
       } else if (p.sauce.type==1){
         msg.setAttribute("style", "background-image: url(\""+p.sauce.text+"\");")
       }
       document.getElementById("yourCards").appendChild(msg);
     }
}
