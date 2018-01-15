var board = {};
var list = {};

var authorizeTrello = function(){
  Trello.authorize({
    type: "redirect",
    name: "Trello2Day",
    scope: {
      read: true,
      write: false },
    expiration: "never",
    authenticationSuccess,
    authenticationFailure
  });
};

var authenticationSuccess = function() { console.log("Successful authentication"); };
var authenticationFailure = function() { console.log("Failed authentication"); };


function findObjectByAttribute (items, attribute, value) {
    for (var i = 0; i < items.length; i++) {
        if (items[i][attribute] === value) {
            return items[i];
        }
    }
    return false;
}

var getListName = function(idList){
    if(typeof list[idList] != 'undefined'){
        //console.log("LIST CACHE:"+idList + "=" + list[idList].name);
        return list[idList].name;

    } else {
        //console.log("LIST GET: "+idList);

        list[idList] = "-"; // Lo creamos para solo pedirlo una vez
        $.when(Trello.lists.get(idList))
            .then(function(data) {
                //console.log("LIST OK: "+idList+"="+data.name);

                list[idList] = data;
                $(".list-"+idList).html(data.name);

                return list[idList].name;
            });
        return "-";
    }
}

var loadBoards = function (){
    console.log("LOAD boards");

    Trello.get('/members/me/boards?filter=open',
        function(data) {
            //console.log(data);
            board = data;

            $.each(data, function(index,value){
                $(".board-"+this.id).html(this.name);
//                console.log("(ME) board: " + this.id + " " + this.name);
            });

            if(typeof organization !== 'undefined'){
                Trello.get('/organizations/'+organization+'/boards?filter=open',
                function(data) {
                    $.merge(board, data);

                    $.each(data, function(index,value){
                        $(".board-"+this.id).html(this.name);
//                        console.log("(ORG) board:" + this.id + " " + this.name);
                    });
                });
            }
        });

}

var loadTeam = function(){
//  console.log("LOAD team");
  $( "#msg" ).text("LOAD TEAM");
  //console.log(board);

  //https://api.trello.com/1/organizations/publicorg?members=all&member_fields=username,fullName&fields=name,desc&key=[application_key]&token=[optional_auth_token]
  if(typeof organization !== 'undefined'){
    Trello.get('/organizations/'+organization+'/members/all',
        function(data) {
          //console.log(data);

          var optmember = $("#opt-member");
          optmember.find('option').remove();

          optmember.append($("<option />").text("-SELECT-"));

          $.each(data, function(id,item){
            optmember.append($("<option />").val(item.id).text(item.fullName));
            //console.log(item);
          });

        });
  } else {
    $( "#msg" ).text("NO TEAM (organization undefined)");
    console.log("NO TEAM (organization undefined)");
  }
}

var printCards = function(data) {
    $( "#msg" ).html("OK");
    data.each(function(item){
      $("$list").append(""+item);
    })
    //console.log(data);
    };

var getBoardName  = function(idBoard) {

    var boardFound = findObjectByAttribute (board, 'id', idBoard);
    if(boardFound !== false ){
        //console.log("BOARD CACHE:"+idBoard+"="+boardFound.name);
        return boardFound.name;

    } else {
        //console.log("BOARD GET: "+idBoard);

        board[idBoard] = "-"; // Lo creamos para solo pedirlo una vez
        $.when(Trello.boards.get(idBoard))
            .then(function(data) {
                //console.log("BOARD OK: "+idBoard+"="+data.name);

                board[idBoard] = data;
                $(".board-"+idBoard).html(data.name);

              return board[idBoard].name;
          });
        return "-";
    }
}

var getMyBoards = function(){

    var dfd = jQuery.Deferred();
    Trello.get('/members/me/boards?fields=all&list=true&list_fields=all&filter=open',
        function(data) {

            dfd.resolve(data);

        });

    return dfd;
};

var getCardsFromList = function(listId){

    var dfd = jQuery.Deferred();

//    console.log('---GET LIST '+listId);

    Trello.get('/lists/'+ listId +'/cards',
        function(data) {
//            console.log('---GOT LIST '+listId);

            var cards = [];
            $.each(data,function(id,item){
                //console.log('--- '+item.name);
                cards.push(item);
            });

//            console.log('---SORT LIST '+listId + '['+ data.length+' / '+ cards.length+']');
            sortCards(cards);

//            console.log('---RESOLVE LIST '+listId);
            dfd.resolve(cards);
        });

    return dfd;
};

var getNamedListFromBoard = function(boardId,name, cards = false){

    var dfd = jQuery.Deferred();

    Trello.get('/boards/'+ boardId +'/lists'+(cards?'?cards=open':''),
        function(data) {
            $.each(data,function(id,item){

                if(item.name == name){
                    //console.log('-- '+ item.id + ' ' +item.name);
                    dfd.resolve(item);
                }

            });

        });

    return dfd;
};