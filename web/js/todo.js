let taskCountToday = 0;
let taskCountFuture = 0;

let scrumInit = {
    today : {
      done : 0,
      total: 0
    },
    iteration : {
      done : 0,
      total: 0
    },
    total : {
      done : 0,
      total: 0
    }
  };
let scrum;

let listStatus = {};

$.getScript("https://api.trello.com/1/client.js?key="+trellokey, function(){
    console.log("Trello Client Script loaded.");

    authorizeTrello();

    $.when( loadBoards() )
        .then(function(data){
            loadCards("LOAD");
        });

    $("#msg").append('<div id="scrumBoard" class=""></div>');
    $("#list-status").on('click','input[type=checkbox]', selectedStatus );
    $("#list-boards").on('click','input[type=checkbox]', selectedBoard ); 
});

$( "#reloadCards" ).click(function() {
    $("#scrumBoard").html("");
    loadCards("RELOAD");
});

function appendStatusList(idList,listNameSlug,listName){

  const itemStr ='<li class="listStatus-'+idList+'"><input type="checkbox" data-slug="' + listNameSlug + '" checked/><span class="list-name">'+listName+'</span></li>';
  $('#list-status').append(itemStr);

}


var loadCards = function(strMsg){

  // RESET
  taskCountToday = 0;
  taskCountFuture = 0;
  taskCountIteration = 0;
  scrum = (JSON.parse(JSON.stringify(scrumInit))); // http://heyjavascript.com/4-creative-ways-to-clone-objects/

//  Trello.get('/members/me/cards/open?fields=name,due,list&list=true&list_fields=all',
  Trello.get('/members/me/cards/open?fields=all&list=true&list_fields=all',
    function(data) {
      $( "#msg #text" ).html(strMsg+" OK");
      $("#list").html("");

      var todoTasks = [];
      $.each(data,function(id,item){

        if(item.due !== null && item.dueComplete == false ){
          //console.log({item},item.dueComplete);

          todoTasks.push(item);
        } else {
          //console.log('NO!',{item});
        }
      });

      todoTasks.sort( (a,b) => {
        const dateA = new Date(a.due);
        const dateB = new Date(b.due);
        return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
      });

      $( "#msg #text" ).append(": "+todoTasks.length+" tasks");
      var today = new Date();
      var futureDay = new Date(new Date().setDate(new Date().getDate()+noFutureDays))

      console.log(today.getTime());
      var todayStarts = today.getTime();
      var todayEnds = todayStarts + 86400000;
      var futureStarts = futureDay.getTime();

      $.each(todoTasks,function(id,item){
        var itemDueDate = new Date(item.due);
        var itemClass = "";
        var itemDueDateTime = itemDueDate.getTime();
        
        if(itemDueDateTime > futureStarts ){
            itemClass =  itemClass + "futuretask";
            taskCountFuture ++;
        } else if( itemDueDateTime < todayStarts ){
            itemClass =  itemClass + "latetask";
            taskCountToday ++; // It has to be done TODAY!
            taskCountIteration ++;
        } else if( itemDueDateTime < todayEnds ){
            // console.log('today', item);
            itemClass =  itemClass + "todaytask";
            taskCountToday ++;
            taskCountIteration ++;
        } else {
            taskCountIteration ++;
        }

        if(scrumPoints){
            // var scrumRegex = /\((([\d]+)\/([\d]+))\)/; // /(\([\d]+\/[\d]+\))/;
            //var scrumRegex = /\(((([\d])+\/)?([\d]+))\)/;
            var scrumRegex = /\(((([\d]+(.[\d])?)\/)?([\d]+(.[\d])?))\)/;
            var matches = item.name.match(scrumRegex);

            if (matches != null) {
                //console.log(matches);
                //console.log(matches[1]+" "+item.id+" "+item.name);
                //console.log("Done: "+matches[3]+" Total: "+matches[5]);

                if(matches[3] != null){
                    scrum.total.done = scrum.total.done + +matches[3];
                }
                if(matches[5] != null){
                    scrum.total.total =+ scrum.total.total + +matches[5];
                }
                //console.log("tD"+scrum.total.done+"tT:"+scrum.total.total);

                if(itemDueDate.getTime() < futureDay.getTime()){
                    if(matches[3] != null){
                        scrum.iteration.done = scrum.iteration.done + +matches[3];
                    }
                    if(matches[5] != null){
                        scrum.iteration.total = scrum.iteration.total + +matches[5];
                    }
                }
                //console.log("iD"+scrum.iteration.done+"iT:"+scrum.iteration.total);
            }
        }

        var listName = getListName(item.idList);
        var listNameSlug;
        if(typeof listName != 'undefined'){
          var slug = slugify(listName);
          listNameSlug = "list-"+slug;

          appendStatusList(item.idList,slug,listName);
        } else {
          listNameSlug = "";
        }
    
        var daysLate = Math.floor( (Date.now() - itemDueDate.getTime() ) / 86400000);

        var status = item.idList;

        var board = {
          id: item.idBoard,
          name: getBoardName(item.idBoard)
        };
        
        var itemStr = `<li class="card ${listNameSlug} show" data-listid="${item.idList}" data-boardid="${board.id}">` + 
            "<div class='card-header'>"+
            `  <span class="board board-${board.id}"><a href="http://trello.com/b/${board.id}/">${board.name}</a></span>`+
            `  <span class="badge list list-${item.idList} ${listNameSlug}">${listName}</span>`+
            "</div>" +
            `<div class="card-body ${itemClass}">`+
            `  <h2><a href="http://trello.com/c/${item.id}" target="_blank">${item.name}</a></h2>`+
            "  <div class='badges'>" +
            "   <span class='badge date'>"+itemDueDate.getFullYear()+"-"+(itemDueDate.getMonth()+1)+"-"+itemDueDate.getDate()+
            "   ["+daysLate+"]</span>"+
            "  </div>" +
            "</div>" +
            "</li>";

        $("#list").append(itemStr);

        printBoardListItem(null, board, $('.card .board-'+item.idBoard).length);
        sortCardsDOM( $("#list-boards").children(), 'DESC' );

        });

        $("#msg #text").append("[<span id='taskCountToday'>T:"+taskCountToday +"  I:"+ taskCountIteration +"  F:"+taskCountFuture+"</span>] ");

        $("#scrumBoard").remove("#totalTask");
        $("#scrumBoard").append('<span id="totalTask">'+taskCountToday
            + ((taskCountIteration > 0)?' <span class="iterationTasks">[+' + taskCountIteration + ']</span>':'')
            + '</span>');

        if(scrumPoints){
            //$("#msg").append("<span>Scrum Today: ("+scrumToday['done']+"/"+scrumToday['total']+")</span> ");
            $("#scrumBoard").append('<span id="scrumIteration" class="">'+"Scrum Iteration: ("+scrum.iteration.done+"/"+scrum.iteration.total+")</span> ");
            $("#scrumBoard").append('<span id="scrumTotal" class="">'+"Scrum: ("+scrum.total.done+"/"+scrum.total.total+")</span> ");
        }

        /*
        console.log(list);
        console.log(typeof list);
        for( itemid in list){
          console.log(list[itemid]);
          item = list[itemid];

          if($('#list-status li.list-'+slugify(item.name)+'').length < 0 ){
            $("#list-status").append($('<li class="list-'+slugify(item.name)+'">'+item.name+'</li>'));
          }
          
        }
        */
        },
        function(msg){
          console.log("ERROR getting");
          $("#msg #text").html("Error " + msg);
        }
    );
  };
