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



var getListName = function(idList){

  if(list.hasOwnProperty(idList)){
    //console.log("LIST CACHE:"+idList);

    return list[idList].name;

  } else {
    console.log("LIST GET: "+idList);

    list[idList] = "-"; // Lo creamos para solo pedirlo una vez
    $.when(Trello.lists.get(idList))
      .then(function(data) {
          console.log("LIST OK: "+idList+"="+data.name);

          list[idList] = data;
          $(".list-"+idList).html(data.name);

          return list[idList].name;
      });
    return "-";
  }
}

var loadBoards = function (){
    console.log("LOAD boards");


    Trello.get('/members/me/boards/all',
        function(data) {
            //console.log(data);
            board = data;

            $.each(board, function(index,value){
                $(".board-"+this.id).html(this.name);
            });
        });


    if(typeof organization !== 'undefined'){
        Trello.get('/organizations/'+organization+'/boards/all',
            function(data) {
                //console.log(data);
                $.merge(board, data);

                $.each(board, function(index,value){
                    $(".board-"+this.id).html(this.name);
                });
            });
    }
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

  if(board.hasOwnProperty(idBoard)){
    //console.log("BOARD CACHE:"+idList);

    return board[idBoard].name;

  } else {
    console.log("BOARD GET: "+idBoard);

    board[idBoard] = "-"; // Lo creamos para solo pedirlo una vez
    $.when(Trello.boards.get(idBoard))
      .then(function(data) {
          console.log("BOARD OK: "+idBoard+"="+data.name);

          board[idBoard] = data;
          $(".board-"+idBoard).html(data.name);

          return board[idBoard].name;
      });
    return "-";
  }
}
