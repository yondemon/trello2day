
//---- - ----

$.getScript("https://trello.com/1/client.js?key="+trellokey, function(){
  console.log("Trello Client Script loaded.");

  authorizeTrello();

  loadBoards();

  loadTeam();
});

$("#reloadCards").click(function() {
  var person = $("#opt-member").val();
  //console.log(person);

  loadCards("RELOAD "+$("#opt-member option:selected").text(),person);
});

$("#opt-member").change(function(){
  //console.log(this.value);
  loadCards("LOAD "+$("#opt-member option:selected").text(),this.value);
});




// ---- FUNCTIONS ----

var loadCards = function(strMsg,personId){
//  Trello.get('/members/'+personId+'/cards/open?fields=name,due,idBoard',
  // Trello.get('/members/'+personId+'/cards/open',
  Trello.get('/members/'+personId+'?cards=open',
    function(data) {
      $( "#msg" ).html(strMsg+" OK");
      $("#list").html("");

      var todoTasks = [];
      $.each(data.cards,function(id,item){
//        console.log(item);
        if(item.due !== null && item.dueComplete == false ){
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
      var futureDay = new Date(new Date().setDate(new Date().getDate()+noFutureDays));

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
          "<div class='badges'>" +
          " <span class='badge date'>"+itemDueDate.getFullYear()+"-"+(itemDueDate.getMonth()+1)+"-"+itemDueDate.getDate()+" </span>"+
          " <span class='badge board board-"+item.idBoard+"'>"+getBoardName(item.idBoard)+"</span>" +
          " <span class='badge list list-"+item.idList+"'>"+getListName(item.idList)+"</span>"+
          "</div>"
          "</li>";


        $("#list").append(itemStr);

        });

      $( "#msg" ).append(": LOADED "+$("#list").children().length+" tasks");

      },
    function(msg){
      console.log("ERROR getting");
      $("#msg").html("Error " + msg);
      }
    );
  };



