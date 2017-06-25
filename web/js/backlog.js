//var tasks = [];

$.getScript("https://trello.com/1/client.js?key="+trellokey, function(){

    console.log("Trello Client Script loaded.");

    authorizeTrello();

    loadBacklogs();
});

$( "#reloadCards" ).click(function() {
    loadBacklogs();
});

var loadBacklogs = function(){
    $("#list").html("");
    $("#list-backlogs").html("");

    $.when( getMyBoards() )
    .then(function(data){
        //console.log("B: "+ data.length +"");

        $.each(data,function(id,board){
            //console.log('B- '+ board.id + ' ' + board.name);
           
            $.when(getNamedListFromBoard(board.id,'Backlog',true))
            .then(function(list){
                //console.log('L-- '+ list.id + ' ' + list.name );
                console.log(list);
                printBacklogList(list,board);
            });
        
        });
    });
};

var printBacklogList = function (list,board){
    var count = list.cards.length;
    console.log('-PRINT-');

    var itemClass = "";
    console.log("ID:"+list.id+"b"+board);

    var itemStr ='<li><a href="http://trello.com/b/'+board.id+'/">'+board.name+'</a> [<span class="board-'+board.id+'-count">'+count+'</span>]</li>';

    $("#list-backlogs").append(itemStr);
};

