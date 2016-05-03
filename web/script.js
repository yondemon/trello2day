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

      $( "#msg" ).append(": "+todoTasks.length+" tasks");
      var today = new Date();
      var futureDay = new Date(new Date().setDate(new Date().getDate()+noFutureDays))
      
      $.each(todoTasks,function(id,item){
        var itemDueDate = new Date(item.due);
        var itemClass = "";

        if(itemDueDate.getTime() > futureDay.getTime()){
          itemClass =  itemClass + "futuretask";
        }
        if(itemDueDate.getTime() === today.getTime() || itemDueDate.getTime() < today.getTime()){
          itemClass =  itemClass + "todaytask";
        }
        
        var itemStr = "<li class='"+itemClass+"'><h2><a href='http://trello.com/c/"+item.id+"' target='_blank'>"+item.name+"</a></h2>"+
          " <span class='date'>"+itemDueDate.getFullYear()+"-"+(itemDueDate.getMonth()+1)+"-"+itemDueDate.getDate()+" </span>"+
          " <span class='board'>"+getBoardName(item.idBoard)+"</span>"+
          " "+getListName(item.idList)+"</li>";


        $("#list").append(itemStr);
        });


      //console.log(data);
      },
    function(msg){ 
      console.log("ERROR getting");
      $("#msg").html("Error " + msg);
      }
    );
  };
