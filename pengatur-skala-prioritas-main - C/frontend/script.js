
/* =================================
   VARIABEL APLIKASI
================================= */

let tasks = [];
let currentSort = "manual";

const STORAGE_KEY = "skalaPrioritasTasks";

/* =================================
   ELEMEN HTML
================================= */

const taskForm = document.getElementById("taskForm");
const taskId = document.getElementById("taskId");
const taskName = document.getElementById("taskName");
const deadline = document.getElementById("deadline");
const weight = document.getElementById("weight");
const description = document.getElementById("description");

const taskList = document.getElementById("taskList");
const archiveList = document.getElementById("archiveList");

const emptyMessage = document.getElementById("emptyMessage");
const emptyArchive = document.getElementById("emptyArchive");

const totalTasks = document.getElementById("totalTasks");
const activeTasks = document.getElementById("activeTasks");
const archivedTasks = document.getElementById("archivedTasks");

const submitButton = document.getElementById("submitButton");
const cancelEdit = document.getElementById("cancelEdit");
const sortSelect = document.getElementById("sortSelect");
const formTitle = document.getElementById("formTitle");


/* =================================
   LOCAL STORAGE
================================= */

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);

        if (!savedTasks) {
            tasks = [];
            return;
        }

        const parsedTasks = JSON.parse(savedTasks);

        if (!Array.isArray(parsedTasks)) {
            throw new Error("Format data tugas tidak valid.");
        }

        tasks = parsedTasks.map((task, index) => ({
            id: String(task.id ?? index),
            name: String(task.name ?? ""),
            deadline: String(task.deadline ?? ""),
            weight: Number(task.weight ?? 50),
            description: String(task.description ?? ""),
            archived: Boolean(task.archived),
            manualOrder: Number(task.manualOrder ?? index)
        }));

    } catch (error) {
        console.error("Gagal memuat tugas:", error);
        alert("Data tugas tidak dapat dibaca. Penyimpanan dimulai dari kosong.");
        tasks = [];
    }
}


function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;

    } catch (error) {
        console.error("Gagal menyimpan tugas:", error);
        alert("Tugas gagal disimpan. Periksa kapasitas penyimpanan browser.");
        return false;
    }
}


/* =================================
   FUNGSI TANGGAL
================================= */

function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function isOverdue(taskDeadline) {
    if (!taskDeadline) {
        return false;
    }

    return taskDeadline < getTodayDate();
}


function formatDate(dateString) {
    if (!dateString) {
        return "-";
    }

    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}


function getDaysRemaining(taskDeadline) {
    if (!taskDeadline) {
        return 0;
    }

    const today = new Date(getTodayDate() + "T00:00:00");
    const dueDate = new Date(taskDeadline + "T00:00:00");

    return Math.ceil(
        (dueDate - today) / (1000 * 60 * 60 * 24)
    );
}


/* =================================
   PERHITUNGAN PRIORITAS
================================= */

function calculatePriority(task) {
    const taskWeight = Number(task.weight) || 0;
    const daysRemaining = getDaysRemaining(task.deadline);

    let deadlineScore;

    if (daysRemaining <= 0) {
        deadlineScore = 100;
    } else {
        deadlineScore = Math.max(
            0,
            100 - (daysRemaining / 30 * 100)
        );
    }

    return (taskWeight * 0.5) + (deadlineScore * 0.5);
}


function getPriorityLabel(priority) {
    if (priority >= 70) {
        return {
            text: "Prioritas Tinggi",
            className: "priority-high"
        };
    }

    if (priority >= 40) {
        return {
            text: "Prioritas Sedang",
            className: "priority-medium"
        };
    }

    return {
        text: "Prioritas Rendah",
        className: "priority-low"
    };
}


/* =================================
   KEAMANAN TAMPILAN HTML
================================= */

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}


/* =================================
   PENGURUTAN TUGAS
================================= */

function getSortedTasks(taskArray) {
    const sorted = [...taskArray];

    switch (currentSort) {

        case "deadline-asc":
            sorted.sort((a, b) =>
                a.deadline.localeCompare(b.deadline)
            );
            break;

        case "deadline-desc":
            sorted.sort((a, b) =>
                b.deadline.localeCompare(a.deadline)
            );
            break;

        case "weight-desc":
            sorted.sort((a, b) =>
                b.weight - a.weight
            );
            break;

        case "weight-asc":
            sorted.sort((a, b) =>
                a.weight - b.weight
            );
            break;

        case "priority":
            sorted.sort((a, b) =>
                calculatePriority(b) - calculatePriority(a)
            );
            break;

        case "manual":
        default:
            sorted.sort((a, b) =>
                a.manualOrder - b.manualOrder
            );
            break;
    }

    return sorted;
}


/* =================================
   MEMPERBARUI STATISTIK
================================= */

function updateStats() {
    const active = tasks.filter(task => !task.archived).length;
    const archived = tasks.filter(task => task.archived).length;

    totalTasks.textContent = tasks.length;
    activeTasks.textContent = active;
    archivedTasks.textContent = archived;
}


/* =================================
   MEMBUAT KARTU TUGAS
================================= */

function createTaskCard(task, isArchived = false) {
    const priority = calculatePriority(task);
    const priorityInfo = getPriorityLabel(priority);

    const overdueWarning = isOverdue(task.deadline)
        ? `<span class="overdue-warning">Melebihi Deadline</span>`
        : "";

    const descriptionHTML = task.description
        ? `<p class="task-description">${escapeHTML(task.description)}</p>`
        : "";

    let actionButtons = "";

    if (isArchived) {
        actionButtons = `
            <button
                type="button"
                class="btn-restore"
                data-action="restore"
                data-id="${escapeHTML(task.id)}"
            >
                Pulihkan
            </button>

            <button
                type="button"
                class="btn-delete"
                data-action="delete"
                data-id="${escapeHTML(task.id)}"
            >
                Hapus
            </button>
        `;

    } else {
        actionButtons = `
            <button
                type="button"
                class="btn-edit"
                data-action="edit"
                data-id="${escapeHTML(task.id)}"
            >
                Edit
            </button>

            <button
                type="button"
                class="btn-archive"
                data-action="archive"
                data-id="${escapeHTML(task.id)}"
            >
                Arsipkan
            </button>

            <button
                type="button"
                class="btn-delete"
                data-action="delete"
                data-id="${escapeHTML(task.id)}"
            >
                Hapus
            </button>

            <button
                type="button"
                class="btn-move"
                data-action="move-up"
                data-id="${escapeHTML(task.id)}"
                aria-label="Pindahkan ke atas"
            >
                ↑
            </button>

            <button
                type="button"
                class="btn-move"
                data-action="move-down"
                data-id="${escapeHTML(task.id)}"
                aria-label="Pindahkan ke bawah"
            >
                ↓
            </button>
        `;
    }

    return `
        <article class="task-card ${isArchived ? "archived" : ""}">

            <h3>
                ${escapeHTML(task.name)}
                ${overdueWarning}
            </h3>

            <p>
                <strong>Deadline:</strong>
                ${formatDate(task.deadline)}
            </p>

            <p>
                <strong>Bobot:</strong>
                ${task.weight}/100
            </p>

            <p>
                <strong>Skor Prioritas:</strong>
                ${priority.toFixed(1)}
            </p>

            <span class="priority-badge ${priorityInfo.className}">
                ${priorityInfo.text}
            </span>

            ${descriptionHTML}

            <div class="task-actions">
                ${actionButtons}
            </div>

        </article>
    `;
}


/* =================================
   MENAMPILKAN TUGAS
================================= */

function renderTasks() {
    const active = tasks.filter(task => !task.archived);
    const archived = tasks.filter(task => task.archived);

    const sortedActive = getSortedTasks(active);

    taskList.innerHTML = sortedActive
        .map(task => createTaskCard(task, false))
        .join("");

    archiveList.innerHTML = archived
        .sort((a, b) => a.manualOrder - b.manualOrder)
        .map(task => createTaskCard(task, true))
        .join("");

    emptyMessage.hidden = active.length > 0;
    emptyArchive.hidden = archived.length > 0;

    updateStats();
}


/* =================================
   RESET FORM
================================= */

function resetForm() {
    taskForm.reset();

    taskId.value = "";

    submitButton.textContent = "Tambah Tugas";
    cancelEdit.hidden = true;

    formTitle.textContent = "Tambah Tugas Baru";
}


/* =================================
   MENYIMPAN POSISI TUGAS
================================= */

function saveAllPositions() {
    return saveTasks();
}


/* =================================
   MENAMBAH DAN MENGEDIT TUGAS
================================= */

taskForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = taskName.value.trim();
    const taskDeadline = deadline.value;
    const taskWeight = Number(weight.value);
    const taskDescription = description.value.trim();

    if (!name || !taskDeadline || !weight.value) {
        alert("Mohon lengkapi nama tugas, deadline, dan bobot.");
        return;
    }

    if (!Number.isInteger(taskWeight) || taskWeight < 1 || taskWeight > 100) {
        alert("Bobot pengerjaan harus berupa angka bulat antara 1 sampai 100.");
        return;
    }

    const editingId = taskId.value;

    if (editingId) {
        const taskIndex = tasks.findIndex(
            task => task.id === editingId
        );

        if (taskIndex === -1) {
            alert("Tugas yang ingin diedit tidak ditemukan.");
            resetForm();
            return;
        }

        const oldTask = { ...tasks[taskIndex] };

        tasks[taskIndex] = {
            ...tasks[taskIndex],
            name: name,
            deadline: taskDeadline,
            weight: taskWeight,
            description: taskDescription
        };

        if (!saveTasks()) {
            tasks[taskIndex] = oldTask;
            return;
        }

        alert("Tugas berhasil diperbarui.");

    } else {
        const newTask = {
            id: globalThis.crypto?.randomUUID?.()
                ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: name,
            deadline: taskDeadline,
            weight: taskWeight,
            description: taskDescription,
            archived: false,
            manualOrder: tasks.length
        };

        tasks.push(newTask);

        if (!saveTasks()) {
            tasks.pop();
            return;
        }

        alert("Tugas berhasil ditambahkan.");
    }

    currentSort = "manual";
    sortSelect.value = "manual";

    resetForm();
    renderTasks();
});


/* =================================
   MEMBATALKAN EDIT
================================= */

cancelEdit.addEventListener("click", function() {
    resetForm();
});


/* =================================
   MENGEDIT TUGAS
================================= */

function editTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        alert("Tugas tidak ditemukan.");
        return;
    }

    if (task.archived) {
        alert("Pulihkan tugas terlebih dahulu sebelum mengedit.");
        return;
    }

    taskId.value = task.id;
    taskName.value = task.name;
    deadline.value = task.deadline;
    weight.value = task.weight;
    description.value = task.description;

    submitButton.textContent = "Simpan Perubahan";
    cancelEdit.hidden = false;

    formTitle.textContent = "Edit Tugas";

    taskForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =================================
   MENGHAPUS TUGAS
================================= */

function deleteTask(id) {
    const index = tasks.findIndex(task => task.id === id);

    if (index === -1) {
        return;
    }

    const confirmed = confirm(
        "Apakah Anda yakin ingin menghapus tugas ini?"
    );

    if (!confirmed) {
        return;
    }

    const deletedTask = tasks[index];

    tasks.splice(index, 1);

    if (!saveTasks()) {
        tasks.splice(index, 0, deletedTask);
        return;
    }

    renderTasks();
}


/* =================================
   MENGARSIPKAN TUGAS
================================= */

function archiveTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        return;
    }

    const oldArchived = task.archived;

    task.archived = true;

    if (!saveTasks()) {
        task.archived = oldArchived;
        return;
    }

    renderTasks();
}


/* =================================
   MEMULIHKAN TUGAS
================================= */

function restoreTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        return;
    }

    const oldArchived = task.archived;

    task.archived = false;

    if (!saveTasks()) {
        task.archived = oldArchived;
        return;
    }

    renderTasks();
}


/* =================================
   MENGUBAH URUTAN TUGAS
================================= */

function moveTask(id, direction) {
    const activeTasksList = getSortedTasks(
        tasks.filter(task => !task.archived)
    );

    const currentIndex = activeTasksList.findIndex(
        task => task.id === id
    );

    if (currentIndex === -1) {
        return;
    }

    const targetIndex = currentIndex + direction;

    if (
        targetIndex < 0 ||
        targetIndex >= activeTasksList.length
    ) {
        return;
    }

    const currentTask = activeTasksList[currentIndex];
    const targetTask = activeTasksList[targetIndex];

    const currentOrder = currentTask.manualOrder;
    const targetOrder = targetTask.manualOrder;

    currentTask.manualOrder = targetOrder;
    targetTask.manualOrder = currentOrder;

    currentSort = "manual";
    sortSelect.value = "manual";

    if (!saveAllPositions()) {
        currentTask.manualOrder = currentOrder;
        targetTask.manualOrder = targetOrder;

        renderTasks();
        return;
    }

    renderTasks();
}


/* =================================
   AKSI TUGAS
================================= */

function handleTaskAction(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const action = button.dataset.action;
    const id = button.dataset.id;

    switch (action) {

        case "edit":
            editTask(id);
            break;

        case "delete":
            deleteTask(id);
            break;

        case "archive":
            archiveTask(id);
            break;

        case "restore":
            restoreTask(id);
            break;

        case "move-up":
            moveTask(id, -1);
            break;

        case "move-down":
            moveTask(id, 1);
            break;
    }
}


/* =================================
   EVENT LISTENER DAFTAR TUGAS
================================= */

taskList.addEventListener("click", handleTaskAction);

archiveList.addEventListener("click", handleTaskAction);


/* =================================
   PILIHAN PENGURUTAN
================================= */

sortSelect.addEventListener("change", function() {
    currentSort = sortSelect.value;
    renderTasks();
});


/* =================================
   INISIALISASI APLIKASI
================================= */

function initializeApp() {
    loadTasks();

    currentSort = sortSelect.value || "manual";

    renderTasks();
    resetForm();
}

initializeApp();
