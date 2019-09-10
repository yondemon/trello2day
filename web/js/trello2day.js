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

function updateListStatus(idList,slug,name){

    var check = $('li.listStatus-'+slug);
    if(check.length > 0) {
        $('li.listStatus-' + idList).remove();
    } else {
        $('li.listStatus-' + idList)
            .addClass( 'listStatus-'+slug )
            .removeClass( 'listStatus-'+idList);

        $('li.listStatus-' + slug + ' input[type="checkbox"]').data('slug',slug);
        $('li.listStatus-' + slug + ' .list-name').text(name);
    }
}

function updateCardsList(idList,slug,name){
    $('li.card[data-listid="' + idList + '"]')
        .data('listslug',slug)
        .attr('data-listslug',slug);
}

function getListName(idList){
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
                var slug = slugify(data.name);

                $(".list-"+idList)
                    .html(data.name)
                    .addClass( 'list-'+slug );

                updateCardsList(idList,slug,data.name);

                updateListStatus(idList,slug,data.name);

                return list[idList].name;
            });
        return "-";
    }
}

function loadBoards(){
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

function loadTeam(){
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

function printCards(data) {
    $( "#msg" ).html("OK");
    data.each(function(item){
      $("$list").append(""+item);
    })
    //console.log(data);
    };

function getBoardName(idBoard) {

    var data = getBoardData(idBoard);
    if( data != null){
      return data.name;
    }
    return "-";
}

function getBoardData(idBoard) {

    var boardFound = findObjectByAttribute (board, 'id', idBoard);
    if(boardFound !== false ){
        // console.log("BOARD CACHE:"+idBoard+"="+boardFound.name);
        return boardFound;

    } else {
        // console.log("BOARD GET: "+idBoard);

        board[idBoard] = "-"; // Lo creamos para solo pedirlo una vez
        $.when(Trello.boards.get(idBoard))
            .then(function(data) {
                //console.log("BOARD OK: "+idBoard+"="+data.name);
                board[idBoard] = data;

                $(".board-"+idBoard).html(data.name);

              return board[idBoard];
          });
        return null;
    }
}

function getMyBoards(){

    var dfd = jQuery.Deferred();
    Trello.get('/members/me/boards?fields=all&list=true&list_fields=all&filter=open',
        function(data) {

            dfd.resolve(data);

        });

    return dfd;
};

function getCardsFromList(listId){

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

function getNamedListFromBoard(boardId,name, cards = false){

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


function slugify(str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
  
    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

var selectedBoard = function(event){
    var boardCheck = $(event.target);
    var boardid = $(event.target).data('id');

    if(boardCheck.prop('checked')){
        $('li.card[data-boardid=' + boardid + ']').addClass('show').show();
        $('#totalTask').html($('li.card.show').length);

    } else {

        $('li.card[data-boardid=' + boardid + ']').removeClass('show').hide();
        $('#totalTask').html($('li.card.show').length);

    }
}
var selectedStatus = function(event){
    var statusCheckbox = $(event.target);
    var slug = $(event.target).data('slug');
    
    if(statusCheckbox.prop('checked')){
        
        $('li.card[data-listslug="' + slug + '"]').addClass('show').show();
        $('#totalTask').html($('li.card.show').length);

    } else {
        
        $('li.card[data-listslug="' + slug + '"]').removeClass('show').hide();
        $('#totalTask').html($('li.card.show').length);

    }
}


jQuery.fn.sortDomElements = (function() {
    return function(comparator) {
        return Array.prototype.sort.call(this, comparator).each(function(i) {
              this.parentNode.appendChild(this);
        });
    };
})();


var sortCards = function(cards){
    cards.sort(function(a,b){
        var dateA = new Date(a.dateLastActivity);
        var dateB = new Date(b.dateLastActivity);
        return (dateA < dateB)? -1 : (dateA > dateB ? 1 : 0);
    });
}

var sortTasks = function(){
    tasks.sort(function(a,b){
        var dateA = new Date(a.dateLastActivity);
        var dateB = new Date(b.dateLastActivity);
        return a.dateLastActivity<b.dateLastActivity ? -1 : a.dateLastActivity>b.dateLastActivity ? 1 : 0;
    });
}


var sortCardsDOM = function(cardsList, order = 'ASC'){
    cardsList.sortDomElements(function(a,b){
        var dataA = parseInt($(a).attr("data-sortkey"));
        var dataB = parseInt($(b).attr("data-sortkey"));
        switch(order){
            case 'DESC':
                return (dataA > dataB)? -1 : (dataA < dataB ? 1 : 0);
                break;
            case 'ASC':
            default:
                return (dataA < dataB)? -1 : (dataA > dataB ? 1 : 0);    
                break;
        }
        
    });
}

var printBoardListItem = function (list,board,count){
//    console.log('-PRINT-');

    var countPlaceholder = $('.board-'+board.id+'-count');
    if( countPlaceholder.length == 0 ){
      var itemClass = "";
  //    console.log("ID:"+list.id+"b"+board);

      var itemStr ='<li data-sortkey="'+count+'">'
        +'<input type="checkbox" data-id="' + board.id + '" checked/>'
        +'<a href="http://trello.com/b/'+board.id+'/">'
        +'<span class="board-'+board.id+'">'+board.name+'</span></a>'
        +'[<span class="board-'+board.id+'-count">'+count+'</span>]</li>';
        $("#list-boards").append(itemStr);
    } else {
      countPlaceholder.html(count);
    }
    
};
