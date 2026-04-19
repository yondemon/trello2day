$.getScript("https://trello.com/1/client.js?key=" + trellokey, function () {
  console.log("Trello Client Script loaded.");

  authorizeTrello();

  loadWaiting();

  $("#msg").append('<div id="scrumBoard" class=""></div>');
  $("#scrumBoard").append('<span id="totalTask">0</span>');
  $("#list-boards").on("click", "input[type=checkbox]", selectedBoard);
});

$("#reloadCards").click(function () {
  setStatus("WARN", "Loading...");
  loadWaiting();
});

const printCard = (card, board) => {
  const today = new Date();
  const itemDueDate = card.due ? new Date(card.due) : null;
  const itemClass = itemDueDate && itemDueDate <= today ? "todaytask" : "";
  renderCard(card, board, { itemClass });
};

const loadWaiting = () => {
  setStatus("WARN", "Loading waiting list...");
  loadCardsFromNamedList(COL_WAITING, printCard);
};
