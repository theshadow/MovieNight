/// <reference path="./both.js" />

function setPlaying(title, link) {
    if (title !== "") {
        $('#playing').text(title);
        document.title = "Movie Night | " + title;
    } else {
        $('#playing').text("");
        document.title = "Movie Night";
    }

    $('#playing').removeAttr('href');
    if (link !== "") {
        $('#playing').attr('href', link);
    }
}

function startGo() {
    if (!WebAssembly.instantiateStreaming) { // polyfill
        WebAssembly.instantiateStreaming = async (resp, importObject) => {
            const source = await (await resp).arrayBuffer();
            return await WebAssembly.instantiate(source, importObject);
        };
    }

    const go = new Go();
    WebAssembly.instantiateStreaming(fetch("/static/main.wasm"), go.importObject).then((result) => {
        go.run(result.instance);
    }).catch((err) => {
        console.error(err);
    });
}

function getWsUri() {
    port = window.location.port;
    if (port != "") {
        port = ":" + port;
    }
    return "ws://" + window.location.hostname + port + "/ws";
}

let maxMessageCount = 0
function appendMessages(msg) {
    let msgs = $("#messages").find('div');

    // let's just say that if the max count is less than 1, then the count is infinite
    // the server side should take care of chaking max count ranges
    if (msgs.length > maxMessageCount) {
        msgs.first().remove();
    }

    $("#messages").append(msg);
    $("#messages").children().last()[0].scrollIntoView({ block: "end", behavior: "smooth" });
}

function purgeChat() {
    $('#messages').empty()
}

inChat = false
function openChat() {
    console.log("chat opening");
    $("#joinbox").css("display", "none");
    $("#chat").css("display", "grid");
    $("#hidden").css("display", "")
    $("#msg").val("");
    $("#msg").focus();
    inChat = true;
}

function closeChat() {
    console.log("chat closing");
    $("#joinbox").css("display", "");
    $("#chat").css("display", "none");
    $("#hidden").css("display", "none")
    setNotifyBox("That name was already used!");
    inChat = false;
}

function join() {
    let name = $("#name").val();
    if (!isValidName(name)) {
        setNotifyBox("Please input a valid name");
        return;
    }
    if (!sendMessage($("#name").val())) {
        setNotifyBox("could not join");
        return;
    }
    setNotifyBox();
    openChat();
}

function websocketSend(data) {
    if (ws.readyState == ws.OPEN) {
        ws.send(data);
    } else {
        console.log("did not send data because websocket is not open", data);
    }
}

function sendChat() {
    sendMessage($("#msg").val());
    $("#msg").val("");
}

function updateSuggestionCss(m) {
    if ($("#suggestions").children().length > 0) {
        $("#suggestions").css("bottom", $("#msg").outerHeight(true) - 1 + "px");
    }
}

function setNotifyBox(msg = "") {
    $("#notifyBox").html(msg);
}

// Button Wrapper Functions
function auth() {
    let pass = prompt("Enter pass");
    if (pass != "") {
        sendMessage("/auth " + pass);
    }
}

function nick() {
    let nick = prompt("Enter new name");
    if (nick != "") {
        sendMessage("/nick " + nick);
    }
}

function help() {
    sendMessage("/help");
}

function showColors(show) {
    $("#hiddencolor").css("display", show ? "block" : "");
}

function colorAsHex() {
    let r = parseInt($("#colorRed").val()).toString(16).padStart(2, "0");
    let g = parseInt($("#colorGreen").val()).toString(16).padStart(2, "0");
    let b = parseInt($("#colorBlue").val()).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`
}

function updateColor() {
    let r = $("#colorRed").val();
    let g = $("#colorGreen").val();
    let b = $("#colorBlue").val();

    $("#colorRedLabel").text(r.padStart(3, "0"));
    $("#colorGreenLabel").text(g.padStart(3, "0"));
    $("#colorBlueLabel").text(b.padStart(3, "0"));

    $("#colorName").css("color", `rgb(${r}, ${g}, ${b})`);

    if (isValidColor(colorAsHex())) {
        $("#colorWarning").text("");
    } else {
        $("#colorWarning").text("Unreadable Color");
    }
}

function changeColor() {
    if (isValidColor(colorAsHex())) {
        sendMessage("/color " + colorAsHex());
        showColors(false);
    }
}


// Get the websocket setup in a function so it can be recalled
function setupWebSocket() {
    ws = new WebSocket(getWsUri());
    ws.onmessage = (m) => recieveMessage(m.data);
    ws.onopen = () => console.log("Websocket Open");
    ws.onclose = () => {
        closeChat();
        setNotifyBox("The connection to the server has closed. Please refresh page to connect again.");
        $("#joinbox").css("display", "none");
    }
    ws.onerror = (e) => {
        console.log("Websocket Error:", e);
        e.target.close();
    }
}

function setupEvents() {
    $("#name").on({
        keypress: (e) => {
            if (e.originalEvent.keyCode == 13) {
                $("#join").trigger("click");
            }
        }
    });

    $("#msg").on({
        keypress: (e) => {
            if (e.originalEvent.keyCode == 13 && !e.originalEvent.shiftKey) {
                $("#send").trigger("click");
                e.preventDefault();
            }
        },
        keydown: (e) => {
            if (processMessageKey(e)) {
                e.preventDefault();
            }
        },
        input: () => processMessage(),
    });

    $("#send").on({
        click: () => $("#msg").focus(),
    });

    var suggestionObserver = new MutationObserver(
        (mutations) => mutations.forEach(updateSuggestionCss)
    ).observe($("#suggestions")[0], { childList: true });
}

function defaultValues() {
    $("#colorRed").val(0).trigger("input");
    $("#colorGreen").val(0).trigger("input");
    $("#colorBlue").val(0).trigger("input");
}

window.addEventListener("onresize", updateSuggestionCss);

window.addEventListener("load", () => {
    setNotifyBox();
    setupWebSocket();
    startGo();
    setupEvents();
    defaultValues();

    // Make sure name is focused on start
    $("#name").focus();
});

function pleaseremovethis() {
    colors = ["aliceblue", "antiquewhite", "aqua", "aquamarine", "azure",
        "beige", "bisque", "black", "blanchedalmond", "blue",
        "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse",
        "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson",
        "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray",
        "darkgrey", "darkgreen", "darkkhaki", "darkmagenta", "darkolivegreen",
        "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
        "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet",
        "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue",
        "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro",
        "ghostwhite", "gold", "goldenrod", "gray", "grey",
        "green", "greenyellow", "honeydew", "hotpink", "indianred",
        "indigo", "ivory", "khaki", "lavender", "lavenderblush",
        "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan",
        "lightgoldenrodyellow", "lightgray", "lightgrey", "lightgreen", "lightpink",
        "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey",
        "lightsteelblue", "lightyellow", "lime", "limegreen", "linen",
        "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid",
        "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise",
        "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin",
        "navajowhite", "navy", "oldlace", "olive", "olivedrab",
        "orange", "orangered", "orchid", "palegoldenrod", "palegreen",
        "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru",
        "pink", "plum", "powderblue", "purple", "rebeccapurple",
        "red", "rosybrown", "royalblue", "saddlebrown", "salmon",
        "sandybrown", "seagreen", "seashell", "sienna", "silver",
        "skyblue", "slateblue", "slategray", "slategrey", "snow",
        "springgreen", "steelblue", "tan", "teal", "thistle",
        "tomato", "turquoise", "violet", "wheat", "white",
        "whitesmoke", "yellow", "yellowgreen",]

}