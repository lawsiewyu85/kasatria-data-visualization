import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
const API_KEY = "AIzaSyCbZMuJYkJTZdaB-JhLttfNbXhYn2Js-xc";
const SPREADSHEET_ID = "1rhYDxvXP0EDGxh-WOrBgTnltiUDQe2kfhByLHTUso-Q";
const SHEET_NAME = "Data Template";

// =====================================================
// GLOBAL VARIABLES
// =====================================================

let people = [];

let scene;
let camera;
let renderer;
let cssRenderer;
let controls;

let currentObjects = [];

const visualization = document.getElementById("visualization");
const tableView = document.getElementById("tableView");
const loading = document.getElementById("loading");


// =====================================================
// WORTH COLORS
// =====================================================

function getNetWorthColor(netWorth) {

    if (netWorth < 100000) {
        return 0xef4444; // Red
    }

    if (netWorth <= 200000) {
        return 0xf59e0b; // Orange
    }

    return 0x22c55e; // Green
}


// =====================================================
// LOAD GoogleSheet
// =====================================================

async function loadGoogleSheet() {

    console.log("Starting Google Sheet loading...");

    try {

        const range = encodeURIComponent(`${SHEET_NAME}!A1:F201`);

        const url =
            `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

        console.log("Google Sheet URL:", url);

        const response = await fetch(url);

        if (!response.ok) {

            const errorText = await response.text();

            throw new Error(
                `Google Sheets API error: ${response.status} ${errorText}`
            );
        }

        const data = await response.json();

        console.log("Google Sheet data:", data);

        people = parseSheetData(data.values);

        console.log("Loaded people from Google Sheet:", people.length);

        loading.style.display = "none";

        createTable();
        initThree();

    } catch (error) {

        console.error(error);

        loading.innerHTML =
            "Unable to load data from Google Sheet<br>" +
            "<small>Check your API key, Sheet sharing settings, and Google Sheets API.</small>";
    }
}


// =====================================================
// CSV PARSER
// =====================================================

function parseCSV(text) {

    const rows = [];

    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        if (char === '"') {

            if (insideQuotes && text[i + 1] === '"') {

                value += '"';
                i++;

            } else {

                insideQuotes = !insideQuotes;
            }

        } else if (char === "," && !insideQuotes) {

            row.push(value.trim());
            value = "";

        } else if ((char === "\n" || char === "\r") && !insideQuotes) {

            if (char === "\r" && text[i + 1] === "\n") {
                i++;
            }

            row.push(value.trim());

            if (row.some(cell => cell !== "")) {
                rows.push(row);
            }

            row = [];
            value = "";

        } else {

            value += char;
        }
    }

    if (value.length > 0 || row.length > 0) {

        row.push(value.trim());

        if (row.some(cell => cell !== "")) {
            rows.push(row);
        }
    }

    const headers = rows[0].map(header =>
        header.trim().toLowerCase().replace(/\s+/g, "")
    );

    return rows.slice(1).map(row => {

        const person = {};

        headers.forEach((header, index) => {

            person[header] = row[index] || "";

        });

        return {

            name: person.name,

            photo: person.photo,

            age: Number(person.age),

            country: person.country,

            interest: person.interest,

            netWorth: parseFloat(
                person.networth.replace(/[$,]/g, "")
            )
        };

    });
}


// =====================================================
// CREATE TABLE
// =====================================================

function createTable() {

    let html = `
        <div class="periodic-table">
    `;

    people.forEach((person, index) => {

        const color = getNetWorthColor(person.netWorth);

        const borderColor =
            "#" + color.toString(16).padStart(6, "0");

        html += `
            <div
                class="table-person"
                data-index="${index}"
                style="background-color: ${borderColor};"
            >

                <img
                    class="table-photo"
                    src="${person.photo}"
                    alt="${person.name}"
                >

                <div class="table-name">
                    ${person.name}
                </div>

                <div class="table-country">
                    ${person.country}
                </div>

            </div>
        `;

    });

    html += `
        </div>
    `;

    tableView.innerHTML = html;


    // Add click event to every person

    document
        .querySelectorAll(".table-person")
        .forEach(element => {

            element.addEventListener("click", function () {

                const index =
                    Number(this.dataset.index);

                showPersonInfo(people[index]);

            });

        });
}


// =====================================================
// MONEY FORMAT
// =====================================================

function formatMoney(value) {

    return new Intl.NumberFormat("en-US", {

        style: "currency",

        currency: "USD",

        minimumFractionDigits: 2

    }).format(value);
}


// =====================================================
// THREE.JS INITIALIZATION
// =====================================================

function initThree() {

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x050505);


    // CAMERA

    camera = new THREE.PerspectiveCamera(

        60,

        window.innerWidth / (window.innerHeight - 110),

        1,

        5000

    );

    camera.position.set(0, 0, 1000);


    // WEBGL RENDERER

    renderer = new THREE.WebGLRenderer({

        antialias: true

    });

    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.setSize(

        window.innerWidth,

        window.innerHeight - 110

    );

    visualization.appendChild(renderer.domElement);


    // CSS3D RENDERER

    cssRenderer = new CSS3DRenderer();

    cssRenderer.setSize(

        window.innerWidth,

        window.innerHeight - 110

    );

    cssRenderer.domElement.style.position = "absolute";
    cssRenderer.domElement.style.top = "0";
    cssRenderer.domElement.style.left = "0";
    cssRenderer.domElement.style.zIndex = "2";
    cssRenderer.domElement.style.pointerEvents = "auto";

    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "1";
    renderer.domElement.style.pointerEvents = "none";

    visualization.appendChild(cssRenderer.domElement);


    // CONTROLS

    controls = new OrbitControls(
        camera,
        cssRenderer.domElement
    );

    controls.enableDamping = true;

    controls.minDistance = 300;

    controls.maxDistance = 3000;

    controls.domElement.addEventListener("pointerdown", function (event) {

        if (event.target.closest(".person-card")) {
            event.stopPropagation();
        }

    });

    // RESIZE

    window.addEventListener(

        "resize",

        onWindowResize

    );


    animate();
}


// =====================================================
// CREATE PERSON CARD
// =====================================================

function createPersonObject(person) {

    const element = document.createElement("div");

    element.className = "person-card";

    const color = getNetWorthColor(person.netWorth);

    element.style.backgroundColor = "#" + color.toString(16).padStart(6, "0");


    element.innerHTML = `

        <img src="${person.photo}" alt="">

        <div class="person-name">
            ${person.name}
        </div>

        <div class="person-country">
            ${person.country} • ${person.interest}
        </div>

    `;


    element.addEventListener("pointerdown", function (event) {

        event.preventDefault();
        event.stopPropagation();

        console.log("CARD CLICKED:", person.name);

        showPersonInfo(person);

    });


    const object =
        new CSS3DObject(element);

    return object;
}


// =====================================================
// CLEAR CURRENT VIEW
// =====================================================

function clearObjects() {

    currentObjects.forEach(object => {

        scene.remove(object);

    });

    currentObjects = [];
}


// =====================================================
// GRID VIEW
// =====================================================

function showGrid() {

    setActiveButton("gridBtn");

    tableView.style.display = "none";

    visualization.style.display = "block";

    clearObjects();

    // Required Grid: 5 × 4 × 10 = 200

    const columns = 5;
    const rows = 4;
    const layers = 10;

    const spacingX = 220;
    const spacingY = 160;
    const spacingZ = 220;

    people.forEach((person, index) => {

        const object = createPersonObject(person);

        const column = index % columns;

        const row = Math.floor(index / columns) % rows;

        const layer = Math.floor(index / (columns * rows));

        object.position.x =
            (column - (columns - 1) / 2) * spacingX;

        object.position.y =
            (row - (rows - 1) / 2) * spacingY;

        object.position.z =
            (layer - (layers - 1) / 2) * spacingZ;

        scene.add(object);

        currentObjects.push(object);

    });

    camera.position.set(0, 0, 2200);

    controls.target.set(0, 0, 0);

    controls.update();
}

// =====================================================
// SPHERE VIEW
// =====================================================

function showSphere() {

    setActiveButton("sphereBtn");

    tableView.style.display = "none";

    visualization.style.display = "block";

    clearObjects();


    const radius = 600;

    const total = people.length;


    people.forEach((person, index) => {

        const object =
            createPersonObject(person);


        const phi =
            Math.acos(

                -1 +
                (2 * index) / (total - 1)

            );

        const theta =
            Math.sqrt(total * Math.PI) * phi;


        object.position.x =
            radius *
            Math.cos(theta) *
            Math.sin(phi);

        object.position.y =
            radius *
            Math.sin(theta) *
            Math.sin(phi);

        object.position.z =
            radius *
            Math.cos(phi);


        object.lookAt(camera.position);

        scene.add(object);

        currentObjects.push(object);

    });


    camera.position.set(0, 0, 1800);

    controls.target.set(0, 0, 0);

    controls.update();
}


// =====================================================
// DOUBLE HELIX
// =====================================================

function showDoubleHelix() {

    setActiveButton("helixBtn");

    tableView.style.display = "none";

    visualization.style.display = "block";

    clearObjects();


    const spacing = 25;

    const radius = 350;

    const turns = 8;

    const total = people.length;


    people.forEach((person, index) => {

        const object =
            createPersonObject(person);


        const strand =
            index % 2;

        const t =
            index / (total / 2);

        const angle =
            t * Math.PI * 2 * turns;


        object.position.x =
            Math.cos(angle) * radius;

        object.position.y =
            (index - total / 2) * spacing;

        object.position.z =
            Math.sin(angle) * radius;


        if (strand === 1) {

            object.position.x *= -1;

            object.position.z *= -1;

        }


        object.lookAt(camera.position);


        scene.add(object);

        currentObjects.push(object);

    });


    camera.position.set(

        1000,

        0,

        1500

    );

    controls.target.set(0, 0, 0);

    controls.update();
}


// =====================================================
// TABLE VIEW
// =====================================================

function showTable() {

    setActiveButton("tableBtn");

    clearObjects();

    visualization.style.display = "none";

    tableView.style.display = "block";
}


// =====================================================
// ACTIVE BUTTON
// =====================================================

function setActiveButton(id) {

    document
        .querySelectorAll(".controls button")
        .forEach(button => {

            button.classList.remove("active");

        });


    document
        .getElementById(id)
        .classList.add("active");
}


// =====================================================
// INFO PANEL
// =====================================================

function showPersonInfo(person) {

    console.log("Showing information for:", person.name);

    document.getElementById("infoPhoto").src = person.photo;

    document.getElementById("infoName").textContent = person.name;

    document.getElementById("infoAge").textContent = person.age;

    document.getElementById("infoCountry").textContent = person.country;

    document.getElementById("infoInterest").textContent = person.interest;

    document.getElementById("infoNetWorth").textContent =
        formatMoney(person.netWorth);

    document.getElementById("infoPanel").classList.remove("hidden");
}


document
    .getElementById("closeInfo")
    .addEventListener("click", () => {

        document
            .getElementById("infoPanel")
            .classList.add("hidden");

    });


// =====================================================
// BUTTON EVENTS
// =====================================================

document
    .getElementById("tableBtn")
    .addEventListener("click", showTable);

document
    .getElementById("sphereBtn")
    .addEventListener("click", showSphere);

document
    .getElementById("helixBtn")
    .addEventListener("click", showDoubleHelix);

document
    .getElementById("gridBtn")
    .addEventListener("click", showGrid);


// =====================================================
// ANIMATION
// =====================================================

function animate() {

    requestAnimationFrame(animate);

    controls.update();

    currentObjects.forEach(object => {

        object.lookAt(camera.position);

    });

    renderer.render(scene, camera);

    cssRenderer.render(scene, camera);
}


// =====================================================
// WINDOW RESIZE
// =====================================================

function onWindowResize() {

    camera.aspect =
        window.innerWidth /
        (window.innerHeight - 110);

    camera.updateProjectionMatrix();


    renderer.setSize(

        window.innerWidth,

        window.innerHeight - 110

    );


    cssRenderer.setSize(

        window.innerWidth,

        window.innerHeight - 110

    );
}

// =====================================================
// GOOGLE LOGIN
// =====================================================

window.handleCredentialResponse = function (response) {

    console.log("=================================");
    console.log("Google login successful!");

    const data = parseJwt(response.credential);

    console.log("User:", data);

    // Check HTML elements
    const userPhoto = document.getElementById("userPhoto");
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const loginSection = document.getElementById("loginSection");
    const userSection = document.getElementById("userSection");
    const controls = document.querySelector(".controls");

    console.log("userPhoto:", userPhoto);
    console.log("userName:", userName);
    console.log("userEmail:", userEmail);
    console.log("loginSection:", loginSection);
    console.log("userSection:", userSection);
    console.log("controls:", controls);

    // Display Google user
    userPhoto.src = data.picture;
    userName.textContent = data.name;
    userEmail.textContent = data.email;

    // Hide login button
    loginSection.classList.add("hidden");

    // Show user information
    userSection.classList.remove("hidden");

    // Show visualization buttons
    controls.style.display = "flex";

    console.log("Login UI updated successfully!");
    console.log("=================================");

    showGrid();
};

// =====================================================
// DECODE GOOGLE JWT
// =====================================================

function parseJwt(token) {

    const base64Url = token.split(".")[1];

    const base64 =
        base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const jsonPayload =
        decodeURIComponent(
            atob(base64)
                .split("")
                .map(function (c) {

                    return "%" +
                        ("00" + c.charCodeAt(0).toString(16))
                        .slice(-2);

                })
                .join("")
        );

    return JSON.parse(jsonPayload);
}


// =====================================================
// LOGOUT
// =====================================================

document
    .getElementById("logoutBtn")
    .addEventListener("click", function () {

        // Disable Google automatic sign-in
        if (window.google && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
        }

        // Hide user information
        document
            .getElementById("userSection")
            .classList.add("hidden");

        // Show Google login
        document
            .getElementById("loginSection")
            .classList.remove("hidden");

        // Hide controls
        document
            .querySelector(".controls")
            .style.display = "none";

        // Hide visualization
        document
            .getElementById("visualization")
            .style.display = "none";

        // Hide table
        document
            .getElementById("tableView")
            .style.display = "none";

        // Hide info panel
        document
            .getElementById("infoPanel")
            .classList.add("hidden");

        console.log("Google user signed out");

    });


// =====================================================
// START
// =====================================================

loadGoogleSheet();

function parseSheetData(values) {

    const headers = values[0].map(header =>
        header.trim().toLowerCase().replace(/\s+/g, "")
    );

    return values.slice(1).map(row => {

        const person = {};

        headers.forEach((header, index) => {

            person[header] = row[index] || "";

        });

        return {

            name: person.name,

            photo: person.photo,

            age: Number(person.age),

            country: person.country,

            interest: person.interest,

            netWorth: parseFloat(
                person.networth.replace(/[$,]/g, "")
            )

        };

    });

}