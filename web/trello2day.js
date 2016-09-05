var board = Array();
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

var getListName = function(idList){

  if(list.hasOwnProperty(idList)){
//    console.log("CACHE:"+idList);

    return list[idList].name; 

  } else {
//    console.log("GET: "+idList);

    $.when(Trello.lists.get(idList))
    .then(function(data) { 
//        console.log("OK: "+idList+"="+data.name);
        list[idList] = data;

        $(".list-"+idList).html(data.name);

        return list[idList].name;
      });
  }




}

var loadBoards = function (){
  console.log("LOAD boards");

  Trello.get('/organizations/'+organization+'/boards/all',
      function(data) { 
        //console.log(data);
        board = data;

        $.each(board, function(index,value){
          $(".board-"+this.id).html(this.name);
        });
  });
}

var loadTeam = function(){
  console.log("LOAD team");
  $( "#msg" ).text("LOAD TEAM");
  //console.log(board);

  //https://api.trello.com/1/organizations/publicorg?members=all&member_fields=username,fullName&fields=name,desc&key=[application_key]&token=[optional_auth_token]
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
}

var printCards = function(data) { 
    $( "#msg" ).html("OK");
    data.each(function(item){
      $("$list").append(""+item);
    })
    //console.log(data);
    };

var findBoard = function(boardId) {
  if(board.length){
    for (var i = 0, len = board.length; i < len; i++) {
        if (board[i].id === boardId)
            return board[i]; // Return as soon as the object is found
    }
  }
  return null; // The object was not found
//  return {name: "- NO -"};
}

var getBoardName  = function(boardId) {
  thisBoard = findBoard(boardId);
  if(thisBoard)
    return thisBoard.name;
  else
    return "-";
}
