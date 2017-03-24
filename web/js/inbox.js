var tasks = [];

$.getScript("https://trello.com/1/client.js?key="+trellokey, function(){

    console.log("Trello Client Script loaded.");

    authorizeTrello();

//  loadBoards();
//  loadCards("LOAD");
    $("#list").html("");
    $.when( getMyBoards() )
        .then(function(data){
            console.log("B: "+ data.length +"");

            $.each(data,function(id,board){
                //console.log('B- '+ board.id + ' ' + board.name);

                $.when(getNamedListFromBoard(board.id,'INBOX'))
                    .then(function(list){
                        //console.log('L-- '+ list.id + ' ' + item.name + ' ' + list.name );

                        $.when(getCardsFromList(list.id))
                            .then(function(cards){

                                console.log('C:  ' + cards.length + ' ['+ board.id + ' ' + board.name + ']['+ list.id + ' ' + list.name + ']');

                                $.each(cards,function(id,card){

//                                    console.log('-PRINT CARD- ' + card.id );

                                    printCard(card,board);
                                });
                            });
                    });
            });
        });
});


$( "#reloadCards" ).click(function() {
//  loadCards("RELOAD");
    printTasks(cards);
});

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

var getNamedListFromBoard = function(boardId,name){

    var dfd = jQuery.Deferred();

    Trello.get('/boards/'+ boardId +'/lists',
        function(data) {
            $.each(data,function(id,item){

                if(item.name == name){
                    console.log('-- '+ item.id + ' ' +item.name);
                    dfd.resolve(item);
                }

            });

        });

    return dfd;
};

var sortCards = function(cards){
    cards.sort(function(a,b){
        var dateA = new Date(a.dateLastActivity);
        var dateB = new Date(b.dateLastActivity);
        return a.dateLastActivity<b.dateLastActivity ? -1 : a.dateLastActivity>b.dateLastActivity ? 1 : 0;
    });
}


var sortTasks = function(){
    tasks.sort(function(a,b){
        var dateA = new Date(a.dateLastActivity);
        var dateB = new Date(b.dateLastActivity);
        return a.dateLastActivity<b.dateLastActivity ? -1 : a.dateLastActivity>b.dateLastActivity ? 1 : 0;
    });
}

var printCard = function (card,board){
//    console.log('-PRINT-');

    var itemClass = "";
    var itemDueDate = new Date(card.due);

    var itemStr = "<li class='"+itemClass+"'><h2><a href='http://trello.com/c/"+card.id+"' target='_blank'>"+card.name+"</a></h2>"+
        "<div class='badges'>" +
        ((card.due != null)?" <span class='badge date'>"+itemDueDate.getFullYear()+"-"+(itemDueDate.getMonth()+1)+"-"+itemDueDate.getDate()+" </span>":"")+
        " <span class='badge board board-"+board.id+"'>"+board.getNamedListFromBoard+"</span>"+
        //" <span class='badge list list-"+card.idList+"'>"+getListName(card.idList)+"</span>"+
        "</div>"
        "</li>";


    $("#list").append(itemStr);
    $("#msg").html($("#list li").length);
};

var printCards = function (){
    $( "#msg" ).append(": "+tasks.length+" tasks");

    $.each(tasks,function(id,item){
        var itemClass = "";
        var itemDueDate = new Date(item.due);

        var itemStr = "<li class='"+itemClass+"'><h2><a href='http://trello.com/c/"+item.id+"' target='_blank'>"+item.name+"</a></h2>"+
            "<div class='badges'>" +
            " <span class='badge date'>"+itemDueDate.getFullYear()+"-"+(itemDueDate.getMonth()+1)+"-"+itemDueDate.getDate()+" </span>"+
            " <span class='badge board board-"+item.idBoard+"'>"+getBoardName(item.idBoard)+"</span>"+
            " <span class='badge list list-"+item.idList+"'>"+getListName(item.idList)+"</span>"+
            "</div>"
            "</li>";


        $("#list").append(itemStr);
        });
}

var loadCards = function(strMsg){

    // RESET
    taskCountToday = 0;
    taskCountFuture = 0;
//  scrum = (JSON.parse(JSON.stringify(scrumInit))); // http://heyjavascript.com/4-creative-ways-to-clone-objects/

/*
    $( "#msg" ).html(strMsg+" OK");


*/
/*
      $("#msg").append("[<span id='taskCountToday'>T:"+taskCountToday +"  F:"+taskCountFuture+"</span>] ");

      if(scrumPoints){
        $("#msg").append('<div id="scrumBoard" class=""></div>');
        //$("#msg").append("<span>Scrum Today: ("+scrumToday['done']+"/"+scrumToday['total']+")</span> ");
        $("#scrumBoard").append('<span id="scrumIteration" class="">'+"Scrum Iteration: ("+scrum.iteration.done+"/"+scrum.iteration.total+")</span> ");
        $("#scrumBoard").append('<span id="scrumTotal" class="">'+"Scrum: ("+scrum.total.done+"/"+scrum.total.total+")</span> ");
      }

      //console.log(data);
      },
    function(msg){
      console.log("ERROR getting");
      $("#msg").html("Error " + msg);
      }
    );
*/

  };