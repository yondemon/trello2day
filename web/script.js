var taskCountToday = 0;
var taskCountFuture = 0;

var scrumDone = 0;
var scrumTotal = 0;
var scrum = {
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

$.getScript("https://trello.com/1/client.js?key="+trellokey, function(){
  console.log("Trello Client Script loaded.");

  authorizeTrello();

  loadBoards();

  loadCards("LOAD");  
});

$( "#reloadCards" ).click(function() {
  loadCards("RELOAD");
});




var loadCards = function(strMsg){
//  Trello.get('/members/me/cards/open?fields=name,due,list&list=true&list_fields=all', 
  Trello.get('/members/me/cards/open?fields=all&list=true&list_fields=all', 
    function(data) { 
      $( "#msg" ).html(strMsg+" OK");
      $("#list").html("");

      var todoTasks = [];
      $.each(data,function(id,item){

        if(item.due !== null){
          //console.log(item);

          todoTasks.push(item);
        }
      });

      todoTasks.sort(function(a,b){
        var dateA = new Date(a.due);
        var dateB = new Date(b.due);
        return a.due<b.due ? -1 : a.due>b.due ? 1 : 0;
        });

      $( "#msg" ).append(": "+todoTasks.length+" tasks [<span id='taskCountToday'>0</span>]");
      var today = new Date();
      var futureDay = new Date(new Date().setDate(new Date().getDate()+noFutureDays))
      
      $.each(todoTasks,function(id,item){
        var itemDueDate = new Date(item.due);
        var itemClass = "";

        if(itemDueDate.getTime() > futureDay.getTime()){
          itemClass =  itemClass + "futuretask";
          taskCountFuture ++;
        }
        if(itemDueDate.getTime() === today.getTime() || itemDueDate.getTime() < today.getTime()){
          itemClass =  itemClass + "todaytask";
          taskCountToday ++;
        }
        
        // var scrumRegex = /\((([\d]+)\/([\d]+))\)/; // /(\([\d]+\/[\d]+\))/; 
        var scrumRegex = /\(((([\d])+\/)?([\d]+))\)/;
        var matches = item.name.match(scrumRegex);
        if (matches != null) {
          console.log(matches[1]+" "+item.id+" "+item.name);
          console.log("Done: "+matches[3]+" Total: "+matches[4]);

          if(matches[3] != null){
            scrumDone = scrumDone + +matches[3];
          }
          if(matches[4] != null){
            scrumTotal =+ scrumTotal + +matches[4];
          }
        }

        var itemStr = "<li class='"+itemClass+"'><h2><a href='http://trello.com/c/"+item.id+"' target='_blank'>"+item.name+"</a></h2>"+
          " <span class='date'>"+itemDueDate.getFullYear()+"-"+(itemDueDate.getMonth()+1)+"-"+itemDueDate.getDate()+" </span>"+
          " <span class='board board-"+item.idBoard+"'>"+getBoardName(item.idBoard)+"</span>"+
          " <span class='list list-"+item.idList+"'>"+getListName(item.idList)+"</span></li>";


        $("#list").append(itemStr);
        });


      $("#taskCountToday").html("T:"+taskCountToday +"  F:"+taskCountFuture);
      //$("#msg").append("<span>Scrum Today: ("+scrumToday['done']+"/"+scrumToday['total']+")</span>");
      //$("#msg").append("<span>Scrum Iteration: ("+scrumIteration['done']+"/"+scrumIteration['total']+")</span>");
      $("#msg").append("<span>Scrum: ("+scrumDone+"/"+scrumTotal+")</span>");

      //console.log(data);
      },
    function(msg){ 
      console.log("ERROR getting");
      $("#msg").html("Error " + msg);
      }
    );
  };
