var taskCountToday = 0;
var taskCountFuture = 0;

var scrumInit = {
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
var scrum;

$.getScript("https://trello.com/1/client.js?key="+trellokey, function(){
    console.log("Trello Client Script loaded.");

    authorizeTrello();

    $.when( loadBoards() )
        .then(function(data){
            loadCards("LOAD");
        });

    $("#msg").append('<div id="scrumBoard" class=""></div>');
});

$( "#reloadCards" ).click(function() {
    $("#scrumBoard").html("");
    loadCards("RELOAD");
});




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

      $( "#msg #text" ).append(": "+todoTasks.length+" tasks");
      var today = new Date();
      var futureDay = new Date(new Date().setDate(new Date().getDate()+noFutureDays))

      $.each(todoTasks,function(id,item){
        var itemDueDate = new Date(item.due);
        var itemClass = "";

        if(itemDueDate.getTime() > futureDay.getTime()){
            itemClass =  itemClass + "futuretask";
            taskCountFuture ++;
        } else if(itemDueDate.getTime() === today.getTime() || itemDueDate.getTime() < today.getTime()){
            itemClass =  itemClass + "todaytask";
            taskCountToday ++;
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
              listNameSlug = "list-"+slugify(listName);
            } else {
              listNameSlug = "";
            }
    
            var itemStr = "<li class='"+itemClass+"'><h2><a href='http://trello.com/c/"+item.id+"' target='_blank'>"+item.name+"</a></h2>"+
                "<div class='badges'>" +
                " <span class='badge date'>"+itemDueDate.getFullYear()+"-"+(itemDueDate.getMonth()+1)+"-"+itemDueDate.getDate()+" </span>"+
                " <span class='badge board board-"+item.idBoard+"'>"+getBoardName(item.idBoard)+"</span>"+
                " <span class='badge list list-"+item.idList+" "+listNameSlug+"'>"+listName+"</span>"+
                "</div>"
                "</li>";


            $("#list").append(itemStr);
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

      //console.log(data);
        },
        function(msg){
            console.log("ERROR getting");
            $("#msg #text").html("Error " + msg);
        }
    );
  };
