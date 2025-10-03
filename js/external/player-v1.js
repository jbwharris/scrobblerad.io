(function(){ // isolation

var mytuner_scripts = window.mytuner_scripts || {};
mytuner_scripts["player-v1.js-imported"] = true;
mytuner_scripts["player-v1.js"] = initialize;

let mytunerMeta = null;

//initialize();
function initialize(wid) {

    let widget_id = wid;
    let access_token = "";

    let radio_id = document.getElementById(widget_id).dataset.target;
    let autoplay = document.getElementById(widget_id).dataset.autoplay;
    let hidehistory = document.getElementById(widget_id).dataset.hidehistory;
    hidehistory = hidehistory === "true" || hidehistory === true;

    let placeholder_image = "https://mytuner-radio.com/static/icons/widgets/Placeholder/Placeholder.png";

    let volume = localStorage.getItem("myTnr_volume");
    if (volume === null) {
        volume = 100;
    } else {
        volume = parseInt(volume);
        if (Number.isNaN(volume) || volume > 100 || volume < 0) {
            volume = 100;
        }
    }
    volume = volume / 100.0;

    if ( !isNaN(parseInt(radio_id)) && parseInt(radio_id) > 0 ) {

        ajax.call(this, {
            type: 'POST',
            url: 'https://ajax.mytuner-radio.com/ajax/register-widget/',
            dataType : 'json',
            data: {'widget_id': widget_id, 'params': {"radio_id": radio_id}},
            success: function(data) {
                access_token = data.access_token;
                then();
               // let r_p_play = document.getElementById(widget_id + "play-button");
                // addPlayerInstance(widget_id, access_token, function(){
                //     r_p_play.classList.remove("disabled");
                //     if (autoplay === "true" || autoplay === true) {
                //         var AudioContext = window.AudioContext || window.webkitAudioContext || false;
                //         if (AudioContext) {
                //             if ((new AudioContext()).state === "running") {
                //                 players[widget_id].update();
                //             }
                //         }
                //     }
                // });
                // r_p_play.onclick = function(e) {
                //     players[widget_id].update();
                //     e.preventDefault();
                //     e.stopPropagation();
                //     window.status = "test";
                // }
            },
            fail: function() {
                console.error("Failed to obtain myTuner widget token.");
                location.reload();
            }
        });

        function then() {
            if (!hidehistory) {
                ajax.call(this, {
                        type: 'POST',
                        url: 'https://metadata-api.mytuner.mobi/api/v1/metadata-api/widgets/metadata?radio_id='+radio_id,
                        dataType : 'json',
                        data: {'access_token': access_token, 'radio_id': radio_id},
                        success: function(data) {
                        if (data.success) {
                            if (!data.radio_metadata.metadata ) {
                                window.mytuner_scripts.mytunerMeta = `${data.radio_metadata.metadata} - ${data.radio_metadata.start_date}`;
                            }

                            console.log(`${data.radio_metadata.metadata} - ${data.radio_metadata.start_date}`);

                            document.getElementById(widget_id).playlist = data.data;
                            change_dow(new Date().getUTCDay() - 1, widget_id, placeholder_image);  // document.getElementById(widget_id).dataset.fdow);
                            then();
                        } else {
                            if (!data.radio_metadata.metadata ) {
                                window.mytuner_scripts.mytunerMeta = `${data.radio_metadata.metadata} - ${data.radio_metadata.start_date}`;
                            }

                            console.log(`${data.radio_metadata.metadata} - ${data.radio_metadata.start_date}`);

                            console.log("No playlist for selected radio");
                            no_history();
                        }
                    },
                    fail: function() {
                        no_history();
                    }
                });
            } else {
                no_history();
            }

            function no_history() {
                document.getElementById(widget_id).playlist = [[],[],[],[],[],[],[]];
                change_dow(new Date().getUTCDay() - 1, widget_id, placeholder_image);  // document.getElementById(widget_id).dataset.fdow);
                then();
            }

            function then() {
                function updateCurrentSong () {
                    function create_song(data) {
                        var md = data.radio_metadata;
                            if (md.metadata !== "") {
                                if (data.radio_metadata.start_date !== 0 ) {
                                    window.mytuner_scripts.mytunerMeta = `${data.radio_metadata.metadata} - ${data.radio_metadata.start_date}`;
                                }
                                var trackName = md.metadata;
                                var artistName = "";
                                var splitMD = trackName.split(" - ");
                                if (splitMD && splitMD.length === 2) {
                                    trackName = splitMD[1];
                                    artistName = splitMD[0];
                                }

                                var dow_container = document.getElementById(widget_id + "dow-container");
                                var last_song = dow_container.querySelector("span span");
                                if (last_song && last_song.innerText != md.metadata) {
                                    dow_container.insertBefore(song, dow_container.firstChild);
                                }
                            }
                    }
                    function update_song(data) {
                        if (data.radio_metadata.metadata == "") {
                            return;
                        }
                        var r_name = document.getElementsByClassName("player-radio-name");
                        if (r_name.length > 0) {
                            song = r_name[0].lastElementChild;
                            // Change elements position to fit the playing song
                            if (song === null) {
                                // change css
                                r_name[0].style.lineHeight = "30px";

                                var radio_name = document.createElement("span");
                                radio_name.innerText = r_name[0].innerText;
                                r_name[0].innerText = "";

                                var new_song = document.createElement("span");
                                new_song.style.fontWeight = "initial";
                                new_song.style.fontSize = "initial";
                                new_song.innerText = `${data.radio_metadata.metadata} - ${data.radio_metadata.start_date}`;

                                r_name[0].appendChild(radio_name);
                                r_name[0].appendChild(document.createElement("br"));
                                r_name[0].appendChild(new_song);

                            } else {
                                song.innerText = data.radio_metadata.metadata;
                            }
                        }
                    }
                    ajax.call(this, {
                        type: 'POST',
                        url: 'https://metadata-api.mytuner.mobi/api/v1/metadata-api/widgets/metadata?radio_id='+radio_id,
                        dataType : 'json',
                        data: {'access_token': access_token, 'radio_id': radio_id},
                        success: function(data) {
                            if (data.error_code === 0 || data.no_metadata_available === true) {
                                if (hidehistory) {
                                    update_song(data);
                                } else {
                                    create_song(data);
                                }
                            } else {
                                if (data.no_metadata_available === true) {
                                    console.log("No metadata for selected radio");
                                } else {
                                    console.log("Failed to obtain metadata for selected radio");
                                }
                                clearInterval(currentSongTimer);
                            }
                        },
                        fail: function() {
                            console.log("Failed to obtain metadata for selected radio");
                            clearInterval(currentSongTimer);
                        }
                    });
                }
                updateCurrentSong();
                let currentSongTimer = setInterval(updateCurrentSong, 25000);

                // console.log("player-v1.js - initialized.");
            }
        }
    }
}

window.widgetbuilder = change_dow;
function change_dow(day, widget_id, placeholder_image="https://mytuner-radio.com/static/icons/widgets/Placeholder/Placeholder.png") {
    let volume = localStorage.getItem("myTnr_volume");
    if (volume === null) {
        volume = 100;
    } else {
        volume = parseInt(volume);
        if (Number.isNaN(volume) || volume > 100 || volume < 0) {
            volume = 100;
        }
    }
    volume = volume / 100.0;

    if (day < 0) {
        day = 6;
    }
    if (document.getElementById(widget_id).playlist) {
        var pday = document.getElementById(widget_id).playlist[day].slice().reverse();
        song_history = document.getElementById(widget_id + "song-history");
        dow_container = document.createElement("div"); // document.createDocumentFragment();
        dow_container.id = widget_id + "dow-container";
        //var placeholder_image = "https://mytuner-radio.com/static/icons/widgets/Placeholder/Placeholder.png";
        var hasObserver = ("IntersectionObserver" in window);
        for (var i=0; i<pday.length; i++) {
            var music = pday[i];
            var song = document.createElement("li");
            song.style.height = "60px";
            song.style.width = "100%";
            song.style.display = "flex";
            song.style.position = "relative";
            if (i<pday.length - 1) {
                song.style.borderBottom = song_history.dataset.border + "px solid " + song_history.dataset.bordercolor;
            }
            var s_time = document.createElement("span");
            s_time.style.display = "inline-flex";
            s_time.style.alignItems = "center";
            s_time.style.padding = "10px";
            s_time.style.width = "55px";
            s_time.style.whiteSpace = "nowrap";
            s_time.style.fontWeight = "bolder";
            // s_time.innerText = music.start_time;
            var start_time = new Date(music.start_time*1000);
            s_time.innerText = ("0" + start_time.getHours()).substr(-2) + ":" +  ("0" + start_time.getMinutes()).substr(-2);
            var s_container = document.createElement("span");
            s_container.style.display = "flex";
            s_container.style.width = "calc(100% - 55px)";
            s_container.style.overflow = "hidden";
            var s_image = document.createElement("img");
            s_image.style.display = "inline-flex";
            s_image.style.margin = "5px";
            s_image.style.width = "50px";
            s_image.style.height = "50px";
            s_image.style.borderRadius = "5px";
            s_image.alt = music.title;
            if (hasObserver) {
              //  s_image.dataset.src = music.artwork_url.replace(/\/\d+x\d+bb\./g, '/50x50bb.');
              //  s_image.src = placeholder_image;
              //  s_image.classList.add("lazy-playlist-"+day);
            } else {
              //  s_image.src = music.artwork_url.replace(/\/\d+x\d+bb\./g, '/50x50bb.');
            }
            s_image.onerror = function(){
              //  this.src = placeholder_image;
            };
            var s_name = document.createElement("span");
            s_name.style.display = "inline-flex";
            s_name.style.maxWidth = "calc(100% - 60px)";
            s_name.style.height = "100%";
            s_name.style.padding = "5px";
            s_name.style.fontSize = "initial";
            s_name.style.alignItems = "center";
            s_name.style.overflow = "hidden";
            s_name.innerText = (music.artist != "" ? music.artist + " - " : "") + music.title;
            s_container.appendChild(s_image);
            s_container.appendChild(s_name);
            

            song.appendChild(s_time);
            song.appendChild(s_container);

            dow_container.appendChild(song);
        }
        song_history.appendChild(dow_container);
        if (pday.length > 0) {
            document.getElementById(widget_id + "top-bar").style.borderBottom = song_history.dataset.border + "px solid " + song_history.dataset.bordercolor;
        }
        if (hasObserver) {
            let lazyImages = [].slice.call(document.querySelectorAll("img.lazy-playlist-"+day));
            let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        let lazyImage = entry.target;
                       // lazyImage.src = lazyImage.dataset.src;
                        lazyImage.classList.remove("lazy-playlist-"+day);
                        lazyImageObserver.unobserve(lazyImage);
                    }
                });
            });
            lazyImages.forEach(function(lazyImage) {
                lazyImageObserver.observe(lazyImage);
            });
        }
    }
}



function ajax(params) {

    let xhr = new XMLHttpRequest();
    xhr.onload = function() {
        if (this.status == 200) {
            params.success(this.response);
        } else {
            console.error(this.status + ": " + this.statusText);
            if(typeof(params.fail) === "function"){params.fail();}
        }
    };
    xhr.onerror = function() {
        console.error("Network Error");
        if(typeof(params.fail) === "function"){params.fail();}
    }

    //console.log("Calling:", params.type, params.url, !(params.async === false || params.async === "false"));

    xhr.open(params.type, params.url, !(params.async === false || params.async === "false"));
    xhr.responseType = "json";
    //xhr.setRequestHeader("Content-Type", "application/json");
    try {
        xhr.send(JSON.stringify(params.data));
    } catch (e) {
        console.error(e);
        if(typeof(params.fail) === "function"){params.fail();}
    }

}

})();