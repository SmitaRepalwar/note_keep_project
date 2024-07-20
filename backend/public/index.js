  document.addEventListener('DOMContentLoaded', () => {
  const notesContainer = document.getElementById('notesContainer');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const noteModal = document.getElementById('noteModal');
  const noteText = document.getElementById('noteText');
  const saveNoteBtn = document.getElementById('saveNoteBtn');
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const sidebar = document.getElementById('sidebar');
  const searchBar = document.getElementById('searchBar');
  const searchBtn = document.getElementById('searchBtn');
  const trashButton = document.getElementById("trashButton");
  const archivesButton = document.getElementById("archivesButton");
  const notesButton = document.getElementById("notesButton");
  const sideMenuContainer = document.getElementById('sideMenuContainer');
  const labelInputCon = document.getElementById("labelInputCon");
  const labelInput = document.getElementById("labelInput");
  const tagButton = document.getElementById("tagButton");

  let userId;
  // User login (for demonstration)
  async function login(username, password) {
    console.log("hi from login")
    let options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
     },
      body: JSON.stringify({username, password})
    };
  
    let url = "/user_login";

    try {
      const response = await fetch(url, options)
      const data = await response.json()
      userId = data.userId
      localStorage.setItem("my_token", data.token)

    } catch (error) {
      console.log(error)
    }
  }

  (async () => {
    await login("sampath", "sampath");
  })();

  addNoteBtn.addEventListener('click', () => {
    noteText.value = '';
    noteModal.style.display = 'flex';
  });

  saveNoteBtn.addEventListener('click', async () => {
    const text = noteText.value.trim();
    if (text) {
      await saveNoteToServer(text);
      noteModal.style.display = 'none';
      addNoteToDOM(text);
    }
  });

  noteModal.addEventListener('click', (e) => {
    if (e.target === noteModal) {
      noteModal.style.display = 'none';
    }
  });

  labelInputCon.addEventListener('click', (e) => {
    if (e.target === labelInputCon) {
      labelInputCon.style.display = 'none';
    }
  });

  toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  searchBtn.addEventListener('click', () => {
    const query = searchBar.value.toLowerCase();
    filterNotes(query);
  });

  async function loadArchivedNotes() {
    const response = await fetch('/notes/archived');
    const notes = await response.json();
    notesContainer.replaceChildren()
    notes.forEach(note => addNoteToDOM(note.content, note.id));
}

async function loadTrashedNotes() {
    const response = await fetch('/notes/trashed');
    const notes = await response.json();
    notesContainer.replaceChildren()
    notes.forEach(note => addNoteToDOM(note.content, note.id));
}

archivesButton.onclick = ()=>{loadArchivedNotes()}

trashButton.onclick = ()=>{loadTrashedNotes()}

notesButton.onclick = ()=>{loadNotesFromServer()}


  async function onDeleteNote(noteId) {
    let noteElement = document.getElementById(noteId);
        notesContainer.removeChild(noteElement);
        console.log(noteId)
        
        await fetch(`/notes/trash/${noteId}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          }
        });
        loadNotesFromServer();
  }

  async function onArchiveNote(noteId){
    let noteElement = document.getElementById(noteId);
        notesContainer.removeChild(noteElement);
        console.log(noteId)
        
        await fetch(`/notes/archive/${noteId}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          }
        });
        loadNotesFromServer();
  }

  async function loadTags(noteId) {
    const response = await fetch(`/notes/labels/${noteId}`);
    const tags = await response.json();
    return tags;
  }

  function onLabelNote(noteId){
    labelInputCon.style.display = 'flex';
    let noteElement = document.getElementById(noteId);
    
    labelInput.onchange = (event)=>{
      const tagValue = event.target.value
      console.log(tagValue)
      tagButton.value = tagValue
    }
    
    let label;
    tagButton.onclick = (event)=>{
      label = event.target.value
      labelInputCon.style.display = 'none';
      addNoteToServer(label, noteId, userId)
    }

    const addNoteToServer = async(label, noteId, userId) =>{
      console.log("addNoteToSErver", label, noteId, userId)
      await fetch(`/notes/${noteId}/label`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          labelName: label,
          userId
        })
      });
      loadTags(noteId)
      loadNotesFromServer();
    }

  }

  function onBackgroundChangeNote(){}

  async function addNoteToDOM(text, id) {
    const note = document.createElement('div');
    const content = document.createElement("h6");
    const buttonList = document.createElement('div')
    buttonList.className = 'icon-button-con';
    content.textContent = text;

    const archiveButton = document.createElement("button");
    const trashButton = document.createElement("button");
    const backgroundColorButton = document.createElement("button");
    const labelButton = document.createElement("button");

    archiveButton.setAttribute("class", "icon-button")
    const archiveIcon = document.createElement("i");
    archiveIcon.setAttribute('class', 'fa-solid fa-file-arrow-down icon')
    archiveButton.appendChild(archiveIcon)
    archiveButton.setAttribute("id", "archiveButton")
    archiveButton.onclick = function () {
      onArchiveNote(id);
    };
  

    trashButton.setAttribute("class", "icon-button")
    const trashIcon = document.createElement("i");
    trashIcon.setAttribute('class', 'fa-solid fa-trash-can icon')
    trashButton.appendChild(trashIcon)
    trashButton.setAttribute("id", "trashButton")
    trashButton.onclick = function () {
      onDeleteNote(id);
    };

    backgroundColorButton.setAttribute("class", "icon-button")
    const backgroundColorIcon = document.createElement("i");
    backgroundColorIcon.setAttribute('class', ' fa-solid fa-palette icon')
    backgroundColorButton.appendChild(backgroundColorIcon)
    backgroundColorButton.setAttribute("id", 'backgroundColorButton')
    backgroundColorButton.onclick = function () {
      onBackgroundChangeNote(id);
    };

    
    labelButton.setAttribute("class", "icon-button")
    const labelIcon = document.createElement("i");
    labelIcon.setAttribute('class', 'fa-solid fa-tag icon')
    labelButton.appendChild(labelIcon)
    labelButton.setAttribute("id", 'labelButton')
    labelButton.onclick = function () {
      onLabelNote(id)
    };

    buttonList.appendChild(archiveButton)
    buttonList.appendChild(trashButton)
    buttonList.appendChild(backgroundColorButton)
    buttonList.appendChild(labelButton)

    const buttonsAndTextCon = document.createElement("div");
    buttonsAndTextCon.className = "buttons-and-textCon"

    
    buttonsAndTextCon.appendChild(content);
    buttonsAndTextCon.appendChild(buttonList);
    note.appendChild(buttonsAndTextCon);

    const noteTags = await loadTags(id)

    console.log(id, noteTags)

    if(noteTags.length > 0){
      const tagsCon = document.createElement("ul")
      tagsCon.className = 'tags-con'
      noteTags.map((tag, index)=>{
        const tagElement = document.createElement("li")
        tagElement.textContent = tag
        tagsCon.appendChild(tagElement)
      })
      console.log("hello from iteration")
      note.appendChild(tagsCon);
    }

    note.className = 'note';
    note.setAttribute("id", `${id}`)
    notesContainer.appendChild(note);

  }

  async function saveNoteToServer(text) {
    const response = await fetch('/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ note: text, userId })
    });
    console.log(response)
    return response.text();
  }

  async function loadNotesFromServer() {
    const response = await fetch('/notes');
    const notes = await response.json();
    notesContainer.replaceChildren()
    notes.forEach(note => addNoteToDOM(note.content, note.id));
  }

  function filterNotes(query) {
    const notes = notesContainer.querySelectorAll('.note');
    notes.forEach(note => {
      const text = note.textContent.toLowerCase();
      if (text.includes(query)) {
        note.style.display = '';
      } else {
        note.style.display = 'none';
      }
    });
  }

  loadNotesFromServer();
});
