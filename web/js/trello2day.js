let board = {};
let list = {};

let organizationBoards = [];

let authorizeTrello = function () {
  Trello.authorize({
    type: "redirect",
    name: "Trello2Day",
    scope: {
      read: true,
      write: false,
    },
    expiration: "never",
    authenticationSuccess,
    authenticationFailure,
  });
};

let authenticationSuccess = () => {
  console.log("Successful authentication");
};
let authenticationFailure = () => {
  console.log("Failed authentication");
};

function findObjectByAttribute(items, attribute, value) {
  for (let i = 0; i < items.length; i++) {
    if (items[i][attribute] === value) {
      return items[i];
    }
  }
  return false;
}

function updateListStatus(idList, slug, name) {
  const check = $(`li.listStatus-${slug}`);
  if (check.length > 0) {
    $(`li.listStatus-${idList}`).remove();
  } else {
    $(`li.listStatus-${idList}`)
      .addClass(`listStatus-${slug}`)
      .removeClass(`listStatus-${idList}`);

    $(`li.listStatus-${slug} input[type="checkbox"]`).data("slug", slug);
    $(`li.listStatus-${slug} .list-name`).text(name);
  }
}

function updateCardsList(idList, slug, name) {
  $(`li.card[data-listid="${idList}"]`)
    .data("listslug", slug)
    .attr("data-listslug", slug);
}

function getListName(idList) {
  if (typeof list[idList] != "undefined") {
    //console.log("LIST CACHE:"+idList + "=" + list[idList].name);
    return list[idList].name;
  } else {
    //console.log("LIST GET: "+idList);

    list[idList] = "-"; // Lo creamos para solo pedirlo una vez
    $.when(Trello.lists.get(idList)).then(function (data) {
      //console.log("LIST OK: "+idList+"="+data.name);

      list[idList] = data;
      const slug = slugify(data.name);

      $(".list-" + idList)
        .html(data.name)
        .addClass(`list-${slug}`);

      updateCardsList(idList, slug, data.name);

      updateListStatus(idList, slug, data.name);

      return list[idList].name;
    });
    return "-";
  }
}

function loadBoards(filter = {}) {
  console.log("LOAD boards");

  const loadBoardData = (data) => {
    //console.log(data);
    board = data;

    $.each(data, function (index, value) {
      $(".board-" + this.id).html(this.name);
      // console.log("(ME) board: " + this.id + " " + this.name);
    });
  };

  if (filter.organization) {
    // console.log(`org ${filter.organization}`);
    Trello.get(
      `/organizations/${organization}/boards?filter=open`,
      (orgBoards) => {
        organizationBoards = orgBoards.map(item => item.id);
      }
    );
  }
  Trello.get("/members/me/boards?filter=open", loadBoardData);
}

function loadOrganizations() {
  Trello.get(
    "/members/me/organizations",
    { fields: "id,name,displayName,activeBillableMemberCount" },
    function (data) {
      // console.log('Organization DATA');
      // console.log(data);

      const optOrganization = $("#opt-organization");
      optOrganization.find("option").remove();
      optOrganization.append($("<option />").text("-SELECT-"));

      $.each(data, function (id, item) {
        optOrganization.append(
          $("<option />").val(item.id).text(item.displayName)
        );
        // console.log(item);
      });
    }
  );
}

function loadTeam() {
  $("#msg").text("LOAD TEAM");

  //https://api.trello.com/1/organizations/publicorg?members=all&member_fields=username,fullName&fields=name,desc&key=[application_key]&token=[optional_auth_token]
  if (typeof organization !== "undefined") {
    Trello.get(
      `/organizations/${organization}/members/all`,
      //{ fields: "id,fullName", },
      function (data) {
        // console.log(data);

        const optmember = $("#opt-member");
        optmember.find("option").remove();

        optmember.append($("<option />").text("-SELECT-"));

        $.each(data, function (id, item) {
          optmember.append($("<option />").val(item.id).text(item.fullName));
          //console.log(item);
        });
      }
    );
  } else {
    $("#msg").text("NO TEAM (organization undefined)");
    console.log("NO TEAM (organization undefined)");
    loadOrganizations();
  }
}

function printCards(data) {
  $("#msg").html("OK");
  data.each(function (item) {
    $("$list").append("" + item);
  });
  //console.log(data);
}

function getBoardName(idBoard) {
  const data = getBoardData(idBoard);
  if (data != null) {
    return data.name;
  }
  return "-";
}

function colorCardByBoard(board) {
  if (board.prefs.backgroundTopColor) {
    $(`.card[data-boardid=${board.id}]`).css({
      backgroundColor: board.prefs.backgroundTopColor,
      color: getCorrectTextColor(board.prefs.backgroundTopColor),
    });
  }
}

function getBoardData(idBoard) {
  const boardFound = findObjectByAttribute(board, "id", idBoard);
  if (boardFound !== false) {
    // console.log("BOARD CACHE:"+idBoard+"="+boardFound.name);
    colorCardByBoard(boardFound);

    return boardFound;
  } else {
    // console.log("BOARD GET: "+idBoard);

    board[idBoard] = "-"; // Lo creamos para solo pedirlo una vez
    $.when(Trello.boards.get(idBoard)).then(function (boardFound) {
      // console.log("BOARD OK: "+idBoard+"="+boardFound.name);
      board[idBoard] = boardFound;

      colorCardByBoard(boardFound);

      $(`.board-${idBoard}`).html(boardFound.name);

      return board[idBoard];
    });
    return null;
  }
}

function getMyBoards() {
  const dfd = jQuery.Deferred();
  Trello.get(
    "/members/me/boards?fields=all&list=true&list_fields=all&filter=open",
    function (data) {
      // console.log(data);
      board = data;

      dfd.resolve(data);
    }
  );

  return dfd;
}

function getCardsFromList(listId) {
  const dfd = jQuery.Deferred();

  // console.log('---GET LIST '+listId);
  Trello.get(`/lists/${listId}/cards`, function (data) {
    // console.log('---GOT LIST '+listId);

    let cards = [];
    $.each(data, function (id, item) {
      // console.log('--- '+item.name);
      cards.push(item);
    });

    // console.log('---SORT LIST '+listId + '['+ data.length+' / '+ cards.length+']');
    sortCards(cards);

    // console.log('---RESOLVE LIST '+listId);
    dfd.resolve(cards);
  });

  return dfd;
}

function getNamedListFromBoard(boardId, name, cards = false) {
  const dfd = jQuery.Deferred();

  Trello.get(
    `/boards/${boardId}/lists${(cards ? "?cards=open" : "")}`,
    function (data) {
      $.each(data, function (id, item) {
        if (item.name == name) {
          //console.log('-- '+ item.id + ' ' +item.name);
          dfd.resolve(item);
        }
      });
    }
  );

  return dfd;
}

function slugify(str) {
  str = str.replace(/^\s+|\s+$/g, ""); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
  const to = "aaaaeeeeiiiioooouuuunc------";
  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(/-+/g, "-"); // collapse dashes

  return str;
}

const selectedBoard = (event) => {
  const boardCheck = $(event.target);
  const boardId = $(event.target).data("id");

  if (boardCheck.prop("checked")) {
    $(`li.card[data-boardid="${boardId}"]`)
      .addClass("show")
      .show();
    $("#totalTask").html($("li.card.show").length);
  } else {
    $(`li.card[data-boardid="${boardId}"]`)
      .removeClass("show")
      .hide();
    $("#totalTask").html($("li.card.show").length);
  }
};

const selectedStatus = (event) => {
  const statusCheckbox = $(event.target);
  const slug = $(event.target).data("slug");

  if (statusCheckbox.prop("checked")) {
    $(`li.card[data-listslug="${slug}"]`)
      .addClass("show")
      .show();
    $("#totalTask").html($("li.card.show").length);
  } else {
    $(`li.card[data-listslug="${slug}"]`)
      .removeClass("show")
      .hide();
    $("#totalTask").html($("li.card.show").length);
  }
};

jQuery.fn.sortDomElements = (function () {
  return function (comparator) {
    return Array.prototype.sort.call(this, comparator).each(function (i) {
      this.parentNode.appendChild(this);
    });
  };
})();

const sortCards = (cards) => {
  cards.sort((a, b) => {
    const dateA = new Date(a.dateLastActivity);
    const dateB = new Date(b.dateLastActivity);
    return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
  });
};

const sortTasks = () => {
  tasks.sort((a, b) => {
    const dateA = new Date(a.dateLastActivity);
    const dateB = new Date(b.dateLastActivity);
    return a.dateLastActivity < b.dateLastActivity
      ? -1
      : a.dateLastActivity > b.dateLastActivity
      ? 1
      : 0;
  });
};

const sortCardsDOM = (cardsList, order = "ASC") => {
  cardsList.sortDomElements(function (a, b) {
    const dataA = parseInt($(a).data("sortkey"));
    const dataB = parseInt($(b).data("sortkey"));
    switch (order) {
      case "DESC":
        return dataA > dataB ? -1 : dataA < dataB ? 1 : 0;
        break;
      case "ASC":
      default:
        return dataA < dataB ? -1 : dataA > dataB ? 1 : 0;
        break;
    }
  });
};

const printBoardListItem = function (list, board, count) {
  const countPlaceholder = $(".board-" + board.id + "-count");
  if (countPlaceholder.length == 0) {
    let itemClass = "";
    // console.log("n ID:"+board.id+"b"+board.name+" "+count);

    const itemStr = $(
      `<li class="${count > 20 ? "alert" : ""}">` +
        `<input type="checkbox" data-id="${board.id}" checked/>` +
        `<a href="http://trello.com/b/${board.id}/">` +
        `<span class="board-${board.id}">${board.name}</span></a>` +
        `[<span class="board-${board.id}-count">${count}</span>]</li>`
    );

    itemStr.data("sortkey", count);
    $("#list-boards").append(itemStr);
  } else {
    // console.log("o ID:" + board.id + "b" + board + " " + count);
    countPlaceholder.closest("li").data("sortkey", count);
    if (count > 5) countPlaceholder.closest("li").addClass("alert");
    countPlaceholder.html(count);
  }
};

function getCorrectTextColor(hex) {
  // console.log(hex);
  /*
    From this W3C document: http://www.webmasterworld.com/r.cgi?f=88&d=9769&url=http://www.w3.org/TR/AERT#color-contrast
    Color brightness is determined by the following formula: 
    ((Red value X 299) + (Green value X 587) + (Blue value X 114)) / 1000
    */
  threshold = 130; /* about half of 256. Lower threshold equals more dark text on dark background  */
  hRed = hexToR(hex);
  hGreen = hexToG(hex);
  hBlue = hexToB(hex);

  function hexToR(h) {
    return parseInt(cutHex(h).substring(0, 2), 16);
  }
  function hexToG(h) {
    return parseInt(cutHex(h).substring(2, 4), 16);
  }
  function hexToB(h) {
    return parseInt(cutHex(h).substring(4, 6), 16);
  }
  function cutHex(h) {
    return h.charAt(0) == "#" ? h.substring(1, 7) : h;
  }

  cBrightness = (hRed * 299 + hGreen * 587 + hBlue * 114) / 1000;

  return cBrightness > threshold ? "#000000" : "#ffffff";
}
