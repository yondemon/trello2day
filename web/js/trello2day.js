let board = {};
let list = {};

let organizationBoards = [];

function authorizeTrello() {
  Trello.authorize({
    type: "redirect",
    name: "Trello2Day",
    scope: {
      read: true,
      write: !!enablePostpone,
    },
    expiration: "never",
    authenticationSuccess,
    authenticationFailure,
  });
}

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
    return list[idList].name;
  } else {

    list[idList] = "-"; // Lo creamos para solo pedirlo una vez
    $.when(Trello.lists.get(idList)).then(function (data) {

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
  const loadBoardData = (data) => {
    board = data;

    $.each(data, function (index, value) {
      $(".board-" + this.id).html(this.name);
    });
  };

  if (filter.organization) {
    Trello.get(
      `/organizations/${organization}/boards?filter=open`,
      (orgBoards) => {
        organizationBoards = orgBoards.map((item) => item.id);
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

      const optOrganization = $("#opt-organization");
      optOrganization.find("option").remove();
      optOrganization.append($("<option />").text("-SELECT-"));

      $.each(data, function (id, item) {
        optOrganization.append(
          $("<option />").val(item.id).text(item.displayName)
        );
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

        const optmember = $("#opt-member");
        optmember.find("option").remove();

        optmember.append($("<option />").text("-SELECT-"));

        $.each(data, function (id, item) {
          optmember.append($("<option />").val(item.id).text(item.fullName));
        });
      }
    );
  } else {
    $("#msg").text("NO TEAM (organization undefined)");
    loadOrganizations();
  }
}

function printCards(data) {
  $("#msg").html("OK");
  data.each(function (item) {
    $("$list").append("" + item);
  });
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
    colorCardByBoard(boardFound);

    return boardFound;
  } else {

    board[idBoard] = "-"; // Lo creamos para solo pedirlo una vez
    $.when(Trello.boards.get(idBoard)).then(function (boardFound) {
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
      board = data;
      dfd.resolve(data);
    },
    function (error) {
      console.error("Error fetching boards:", error);
      dfd.reject(error);
    }
  );

  return dfd;
}

function getCardsFromList(listId) {
  const dfd = jQuery.Deferred();

  Trello.get(
    `/lists/${listId}/cards`,
    function (data) {
      let cards = [];
      $.each(data, function (id, item) {
        cards.push(item);
      });

      sortCards(cards);
      dfd.resolve(cards);
    },
    function (error) {
      console.error("Error fetching cards from list:", error);
      dfd.reject(error);
    }
  );

  return dfd;
}

function getNamedListFromBoard(boardId, name, cards = false) {
  const dfd = jQuery.Deferred();

  Trello.get(
    `/boards/${boardId}/lists${cards ? "?cards=open" : ""}`,
    function (data) {
      let found = false;
      $.each(data, function (id, item) {
        if (item.name.toLowerCase() === name.toLowerCase()) {
          dfd.resolve(item);
          found = true;
        }
      });
      if (!found) {
        dfd.reject("List '" + name + "' not found on board " + boardId);
      }
    },
    function (error) {
      console.error("Error fetching lists from board:", error);
      dfd.reject(error);
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
    $(`li.card[data-boardid="${boardId}"]`).addClass("show").show();
    $("#totalTask").html($("li.card.show").length);
  } else {
    $(`li.card[data-boardid="${boardId}"]`).removeClass("show").hide();
    $("#totalTask").html($("li.card.show").length);
  }
};

const selectedStatus = (event) => {
  const statusCheckbox = $(event.target);
  const slug = $(event.target).data("slug");

  if (statusCheckbox.prop("checked")) {
    $(`li.card[data-listslug="${slug}"]`).addClass("show").show();
    $("#totalTask").html($("li.card.show").length);
  } else {
    $(`li.card[data-listslug="${slug}"]`).removeClass("show").hide();
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

const buildBoardCountHTML = (counts) => {
  const subs = [
    counts.late  > 0 ? '<span class="sub-count count-late">'   + counts.late   + '</span>' : '',
    counts.today > 0 ? '<span class="sub-count count-today">'  + counts.today  + '</span>' : '',
    counts.future> 0 ? '<span class="sub-count count-future">' + counts.future + '</span>' : '',
  ].join('');
  return '<strong>' + counts.total + '</strong>' +
    (subs ? '<span class="board-sub-counts">' + subs + '</span>' : '');
};

const printBoardListItem = (list, board, rawCounts, options = {}) => {
  const counts = typeof rawCounts === 'number'
    ? { total: rawCounts, late: 0, today: 0, future: 0 }
    : rawCounts;
  const reloadBtn = options.showReload
    ? `<button class="btn-board-reload" data-boardid="${board.id}">↻</button>`
    : '';
  const $placeholder = $(".board-" + board.id + "-count");
  if ($placeholder.length == 0) {
    const $item = $(
      `<li>` +
        `<input type="checkbox" data-id="${board.id}" checked/>` +
        `<a href="http://trello.com/b/${board.id}/">` +
        `<span class="board-${board.id}">${board.name}</span></a>` +
        `[<span class="board-${board.id}-count"></span>]` +
        reloadBtn +
        `</li>`
    );
    $item.data("sortkey", counts.total);
    if (counts.total > ALERT_THRESHOLD) $item.addClass("alert");
    $item.find(".board-" + board.id + "-count").html(buildBoardCountHTML(counts));
    $("#list-boards").append($item);
  } else {
    const $li = $placeholder.closest("li");
    $li.data("sortkey", counts.total);
    $li.toggleClass("alert", counts.total > ALERT_THRESHOLD);
    $placeholder.html(buildBoardCountHTML(counts));
  }
};

function getCorrectTextColor(hex) {
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

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function renderCard(card, board, options = {}) {
  const { list = null, itemClass = "", sortKey = null, showCreationDate = true } = options;

  const itemCreationDate = new Date(1000 * parseInt(card.id.substring(0, 8), 16));
  const itemDueDate = card.due ? new Date(card.due) : null;
  const effectiveSortKey = sortKey !== null ? sortKey : itemCreationDate.getTime() / 1000;

  // Build card element
  const $card = $("<li>")
    .addClass("card show")
    .attr("data-sortkey", effectiveSortKey)
    .attr("data-boardid", board.id);

  // Add list slug class if applicable
  if (list) {
    $card.addClass(`list-${list.slug}`);
    $card.attr("data-listid", list.id);
  }

  // Build header
  const $header = $("<div>").addClass("card-header");
  const $boardLink = $("<span>")
    .addClass(`board board-${board.id}`)
    .append(
      $("<a>")
        .attr("href", `http://trello.com/b/${board.id}/`)
        .text(board.name)
    );
  $header.append($boardLink);

  // Add list badge if applicable
  if (list) {
    $header.append(
      $("<span>")
        .addClass("badge list")
        .addClass(`list-${list.id}`)
        .text(list.name)
    );
  }

  // Build body
  const $body = $("<div>")
    .addClass("card-body")
    .addClass(itemClass);

  // Add card title
  $body.append(
    $("<h2>").append(
      $("<a>")
        .attr("href", `http://trello.com/c/${card.id}`)
        .attr("target", "_blank")
        .text(card.name)
    )
  );

  // Build badges section
  const $badges = $("<div>").addClass("badges");

  if (showCreationDate) {
    $badges.append(
      $("<span>")
        .addClass("badge date creation-date")
        .text(formatDate(itemCreationDate))
    );
  }

  if (itemDueDate) {
    $badges.append(
      $("<span>")
        .addClass("badge date due-date")
        .text(formatDate(itemDueDate))
    );
  }

  $body.append($badges);

  // Assemble card
  $card.append($header);
  $card.append($body);

  // Append to DOM and update
  $("#list").append($card);
  if (board.prefs) colorCardByBoard(board);

  $("#totalTask").html($("#list li").length);
}

function loadCardsFromNamedList(colName, renderFn, onComplete) {
  $("#list").html("");
  $("#list-boards").html("");

  $.when(getMyBoards())
    .then(function (data) {
      let pendingLists = data.length;
      let completedLists = 0;
      let missingBoards = [];

      if (pendingLists === 0) {
        if (onComplete) onComplete(true);
        return;
      }

      const checkComplete = () => {
        completedLists++;
        if (completedLists === pendingLists) {
          if (missingBoards.length > 0) {
            $("#list-boards").append(
              $('<li class="no-list-separator">').text("— sin " + colName + " —")
            );
            missingBoards.forEach((b) => {
              $("#list-boards").append(
                $('<li class="no-list-board">').append(
                  $("<a>").attr("href", "http://trello.com/b/" + b.id + "/").text(b.name)
                )
              );
            });
          }
          if (onComplete) onComplete(true);
        }
      };

      $.each(data, function (id, board) {
        $.when(getNamedListFromBoard(board.id, colName, true))
          .then((list) => {
            printBoardListItem(list, board, list.cards.length);
            sortCardsDOM($("#list-boards").children(), "DESC");
            $.each(list.cards, (id, card) => renderFn(card, board));
            sortCardsDOM($("#list").children());
            checkComplete();
          })
          .fail((error) => {
            console.warn(`${colName} list not found on board ${board.id}`);
            if (typeof error === "string") {
              missingBoards.push(board);
            }
            checkComplete();
          });
      });
    })
    .fail(function (error) {
      console.error("Error loading boards:", error);
      setStatus("KO", "Error loading boards: " + error);
      $("#msg").html("Error loading boards");
      if (onComplete) onComplete(false);
    });
}

let setStatus = (status, msg = "") => {
  const statusElement = document.getElementById("status");
  switch (status) {
    case "OK":
      statusElement.innerHTML = `OK: ${msg}`;
      statusElement.className = "status status-ok";
      break;
    case "KO":
      statusElement.innerHTML = `KO: ${msg}`;
      statusElement.className = "status status-ko";
      break;
    case "WARN":
      statusElement.innerHTML = `WARNING: ${msg}`;
      statusElement.className = "status status-warn";
      break;
    default:
      statusElement.innerHTML = `ERROR: ${status}`;
      statusElement.className = "status status-error";
      break;
  }
};
