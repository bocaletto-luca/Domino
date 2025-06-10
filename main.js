 "use strict";
    
    /* ---------- TAB NAVIGATION ---------- */
    function showTab(evt, tabName) {
      const tabcontents = document.getElementsByClassName("tabcontent");
      for (let tc of tabcontents) {
        tc.style.display = "none";
        tc.classList.remove("active");
      }
      const tablinks = document.getElementsByClassName("tablinks");
      for (let tl of tablinks) {
        tl.classList.remove("active");
      }
      document.getElementById(tabName).style.display = "block";
      document.getElementById(tabName).classList.add("active");
      evt.currentTarget.classList.add("active");
      if (tabName === "recordsTab") loadRecords();
    }
    document.getElementById("defaultTab").click();
    
    /* ---------- Global Variables ---------- */
    let dominoSet = [];
    let playerHand = [];
    let compHand = [];
    let boneyard = [];
    let chain = [];
    let score = 0;
    let moveCount = 0;
    let errorCount = 0;
    const MAX_ERRORS = 5;
    let currentTurn = null; // "player" or "computer"
    let passCounter = 0;    // count consecutive passes (if both pass, game is blocked)
    let gameVariant = 8;    // 8 or 15 (the number of tiles that the player must eventually win with)
    
    /* ---------- Domino Set Generation ---------- */
    function generateDominoSet() {
      const set = [];
      for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
          set.push({ left: i, right: j });
        }
      }
      return set;
    }
    
    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
    
    /* ---------- Start Game ---------- */
    function startGame() {
      const name = document.getElementById("playerName").value.trim();
      if (!name) { alert("Please enter your name."); return; }
      
      gameVariant = parseInt(document.getElementById("gameVariant").value);
      // For standard domino, 7 tiles are dealt.
      dominoSet = shuffleArray(generateDominoSet());
      playerHand = dominoSet.splice(0, 7);
      compHand = dominoSet.splice(0, 7);
      boneyard = dominoSet; // remaining tiles
      
      chain = [];
      score = 0;
      moveCount = 0;
      errorCount = 0;
      passCounter = 0;
      currentTurn = null;
      document.getElementById("drawBtn").style.display = "none";
      document.getElementById("gameMessage").innerText = "";
      
      // Determine starting tile (using highest double if available, else highest pip total)
      function findStartingTile(hand) {
        let doubles = hand.filter(tile => tile.left === tile.right);
        if (doubles.length > 0) {
          return doubles.reduce((max, t) => (t.left > max.left ? t : max));
        } else {
          return hand.reduce((best, t) => ((t.left + t.right) > (best.left + best.right)) ? t : best);
        }
      }
      
      let playerCandidate = findStartingTile(playerHand);
      let compCandidate = findStartingTile(compHand);
      let starter = null;
      let startTile = null;
      
      if (playerCandidate && compCandidate) {
        if (playerCandidate.left === playerCandidate.right &&
            !(compCandidate.left === compCandidate.right)) {
          starter = "player";
          startTile = playerCandidate;
          playerHand.splice(playerHand.indexOf(startTile), 1);
        } else if (compCandidate.left === compCandidate.right &&
                   !(playerCandidate.left === playerCandidate.right)) {
          starter = "computer";
          startTile = compCandidate;
          compHand.splice(compHand.indexOf(startTile), 1);
        } else {
          // If both or none have doubles, choose the one with highest total.
          if ((playerCandidate.left + playerCandidate.right) >= (compCandidate.left + compCandidate.right)) {
            starter = "player";
            startTile = playerCandidate;
            playerHand.splice(playerHand.indexOf(startTile), 1);
          } else {
            starter = "computer";
            startTile = compCandidate;
            compHand.splice(compHand.indexOf(startTile), 1);
          }
        }
      } else if (playerCandidate) {
        starter = "player";
        startTile = playerCandidate;
        playerHand.splice(playerHand.indexOf(startTile), 1);
      } else if (compCandidate) {
        starter = "computer";
        startTile = compCandidate;
        compHand.splice(compHand.indexOf(startTile), 1);
      }
      
      chain.push(startTile);
      currentTurn = starter;
      updateDisplays();
      
      document.getElementById("gameMessage").innerText = (starter === "player") ?
        "Your turn. Click a tile in your hand or draw if no move is available." :
        "Computer starts.";
      
      if (currentTurn === "computer") {
        setTimeout(computerMove, 1000);
      } else {
        checkPlayerMovable();
      }
    }
    
    /* ---------- Render Functions ---------- */
    function renderChain() {
      const container = document.getElementById("chainContainer");
      container.innerHTML = "";
      chain.forEach(tile => {
        container.appendChild(createDominoTile(tile, true));
      });
    }
    
    function renderHand(hand, containerId, showNumbers) {
      const container = document.getElementById(containerId);
      container.innerHTML = "";
      hand.forEach((tile, index) => {
        const tileElem = createDominoTile(tile, showNumbers);
        if (showNumbers && containerId === "playerHand") {
          tileElem.addEventListener("click", () => { playerMove(index); });
        }
        container.appendChild(tileElem);
      });
      if (containerId === "computerHand") {
        document.getElementById("compCount").innerText = hand.length;
      }
    }
    
    function updateDisplays() {
      renderChain();
      renderHand(playerHand, "playerHand", true);
      renderHand(compHand, "computerHand", false);
      updateStatus();
    }
    
    function updateStatus() {
      document.getElementById("scoreDisplay").innerText = score;
      document.getElementById("moveCount").innerText = moveCount;
      document.getElementById("errorCount").innerText = errorCount;
    }
    
    function createDominoTile(tile, showNumbers) {
      const div = document.createElement("div");
      div.className = "domino";
      if (!showNumbers) {
        div.innerText = "";
        div.classList.add("back");
      } else if (tile === null) {
        div.innerText = "";
        div.classList.add("empty");
      } else {
        div.innerText = tile.left + " | " + tile.right;
      }
      return div;
    }
    
    /* ---------- Check if a Tile is Playable ---------- */
    function isTilePlayable(tile) {
      if (chain.length === 0) return true;
      const leftEnd = chain[0].left;
      const rightEnd = chain[chain.length - 1].right;
      return (tile.left === leftEnd || tile.right === leftEnd ||
              tile.left === rightEnd || tile.right === rightEnd);
    }
    
    /* ---------- Player's Draw Action ---------- */
    function drawTile() {
      // Called when player clicks the Draw Tile button.
      if (boneyard.length > 0) {
        const drawn = boneyard.pop();
        playerHand.push(drawn);
        updateDisplays();
        // Hide Draw button if now a tile is playable.
        if (playerHasPlayableTile()) {
          document.getElementById("drawBtn").style.display = "none";
        }
      } else {
        // No more tiles to draw — player must pass.
        passTurn("player");
      }
    }
    
    function playerHasPlayableTile() {
      for (let tile of playerHand) {
        if (isTilePlayable(tile)) return true;
      }
      return false;
    }
    
    /* ---------- Player Move ---------- */
    function playerMove(index) {
      if (currentTurn !== "player") return;
      const tile = playerHand[index];
      if (!isTilePlayable(tile)) {
        flashTile("playerHand", index, "wrong");
        score -= 10;
        errorCount++;
        updateStatus();
        if (errorCount >= MAX_ERRORS) {
          endGame("Game Over! Too many errors.");
          return;
        }
        return;
      }
      if (placeTile(tile)) {
        playerHand.splice(index, 1);
        moveCount++;
        score += 10;
        // Successful move resets pass counter.
        passCounter = 0;
        updateDisplays();
        // Check win condition.
        if (playerHand.length === 0) {
          endGame("Congratulations, you won!");
          return;
        }
        // Change turn to computer.
        currentTurn = "computer";
        document.getElementById("gameMessage").innerText = "Computer's turn.";
        setTimeout(computerMove, 1000);
      }
    }
    
    /* ---------- Place a Tile on the Chain (with proper flip if necessary) ---------- */
    function placeTile(tile) {
      if (chain.length === 0) {
        chain.push(tile);
        return true;
      }
      const leftEnd = chain[0].left;
      const rightEnd = chain[chain.length - 1].right;
      // Try playing on the right end.
      if (tile.left === rightEnd) {
        chain.push(tile);
        return true;
      } else if (tile.right === rightEnd) {
        chain.push({ left: tile.right, right: tile.left });
        return true;
      }
      // Try playing on the left end.
      if (tile.right === leftEnd) {
        chain.unshift(tile);
        return true;
      } else if (tile.left === leftEnd) {
        chain.unshift({ left: tile.right, right: tile.left });
        return true;
      }
      return false;
    }
    
    /* ---------- Flash a Tile (for errors) ---------- */
    function flashTile(containerId, index, color) {
      const container = document.getElementById(containerId);
      const tileElem = container.children[index];
      const originalColor = tileElem.style.backgroundColor;
      tileElem.style.backgroundColor = color;
      setTimeout(() => {
        tileElem.style.backgroundColor = originalColor;
      }, 300);
    }
    
    /* ---------- Computer Turn ---------- */
    function computerMove() {
      if (currentTurn !== "computer") return;
      let playableIndex = compHand.findIndex(tile => isTilePlayable(tile));
      // If no playable tile, draw from boneyard.
      while (playableIndex === -1 && boneyard.length > 0) {
        compHand.push(boneyard.pop());
        playableIndex = compHand.findIndex(tile => isTilePlayable(tile));
      }
      if (playableIndex === -1) {
        // Computer passes.
        passTurn("computer");
        currentTurn = "player";
        document.getElementById("gameMessage").innerText = "Your turn.";
        updateDisplays();
        return;
      }
      const tile = compHand.splice(playableIndex, 1)[0];
      placeTile(tile);
      moveCount++;
      score += 10;
      passCounter = 0;
      updateDisplays();
      if (compHand.length === 0) {
        endGame("Computer wins! Better luck next time.");
        return;
      }
      currentTurn = "player";
      document.getElementById("gameMessage").innerText = "Your turn.";
      updateDisplays();
    }
    
    /* ---------- Handle Pass Turn ---------- */
    // Called when a player (or computer) cannot play even after drawing.
    function passTurn(player) {
      passCounter++;
      if (player === "player") {
        document.getElementById("gameMessage").innerText = "No playable tile. You pass.";
      } else {
        document.getElementById("gameMessage").innerText = "Computer passes.";
      }
      // If passCounter reaches 2 (both players pass consecutively) then the game is blocked.
      if (passCounter >= 2) {
        endBlockedGame();
      }
    }
    
    /* ---------- End Game: Win, Blocked, or Too Many Errors ---------- */
    function endGame(message) {
      alert(message);
      saveRecord();
      currentTurn = null;
    }
    
    function endBlockedGame() {
      // In a blocked game, the winner is determined by the sum of pips in each hand.
      function handSum(hand) {
        return hand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
      }
      const playerSum = handSum(playerHand);
      const compSum = handSum(compHand);
      let message;
      if (playerSum < compSum) {
        message = "Game Blocked! You win by lower pips (" + playerSum + " vs. " + compSum + ").";
      } else if (playerSum > compSum) {
        message = "Game Blocked! Computer wins by lower pips (" + compSum + " vs. " + playerSum + ").";
      } else {
        message = "Game Blocked! It's a draw.";
      }
      alert(message);
      saveRecord();
      currentTurn = null;
    }
    
    /* ---------- Records Management via localStorage ---------- */
    function saveRecord() {
      const name = document.getElementById("playerName").value.trim() || "Anonymous";
      const record = {
        name: name,
        score: score,
        moves: moveCount,
        date: new Date().toLocaleString()
      };
      let records = JSON.parse(localStorage.getItem("dominoRecords") || "[]");
      records.push(record);
      records.sort((a, b) => b.score - a.score);
      localStorage.setItem("dominoRecords", JSON.stringify(records));
    }
    
    function loadRecords() {
      const tbody = document.querySelector("#recordsTable tbody");
      tbody.innerHTML = "";
      let records = JSON.parse(localStorage.getItem("dominoRecords") || "[]");
      if (records.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = "<td colspan='4'>No records yet.</td>";
        tbody.appendChild(row);
        return;
      }
      records.forEach(rec => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${rec.name}</td><td>${rec.score}</td><td>${rec.moves}</td><td>${rec.date}</td>`;
        tbody.appendChild(row);
      });
    }
    
    function clearRecords() {
      if (confirm("Clear all records?")) {
        localStorage.removeItem("dominoRecords");
        loadRecords();
      }
    }
    
    /* ---------- Start New Game Button (Attached to game controls) ---------- */
    function startNewGame() {
      startGame();
    }
    
    // Start a new game immediately while assigning event listener for the "New Game" button.
    document.querySelector(".game-controls button").addEventListener("click", startNewGame);
    
    /* ---------- Allow Player to Draw Tile ---------- */
    // Show the "Draw Tile" button if the player has no playable tile.
    function checkPlayerMovable() {
      if (currentTurn !== "player") return;
      if (!playerHasPlayableTile()) {
        // If boneyard has tiles, let player draw.
        if (boneyard.length > 0) {
          document.getElementById("drawBtn").style.display = "inline-block";
          document.getElementById("gameMessage").innerText = "No move available—you must draw a tile.";
        } else {
          // No moves and no boneyard: player passes.
          passTurn("player");
          currentTurn = "computer";
          setTimeout(computerMove, 1000);
        }
      } else {
        document.getElementById("drawBtn").style.display = "none";
      }
    }
    
    function playerHasPlayableTile() {
      for (let tile of playerHand) {
        if (isTilePlayable(tile)) return true;
      }
      return false;
    }
    
    /* ---------- Initialize the Game on Page Load ---------- */
    // Start a new game when the page loads.
    startGame();
