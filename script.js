var slideIndex = 1;
showSlides(slideIndex);

setInterval(function () {
    plusSlides(1);
}, 4000);

function plusSlides(n) {
    showSlides(slideIndex += n);
}

function currentSlide(n) {
    showSlides(slideIndex = n);
}

function showSlides(n) {
var i;
var slides = document.getElementsByClassName("mySlides");

if (n > slides.length) {slideIndex = 1}    
if (n < 1) {slideIndex = slides.length}
for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";  
}

slides[slideIndex-1].style.display = "block";  

}

const search = () => {
    let filter = document.getElementById('input').value.toLowerCase();

    let block = document.getElementById('block');

    let box = block.getElementsByClassName('box');
    
    let text = block.getElementsByTagName('h3');

    for(var i=0;i < text.length; i++){
        let h3=text[i];
        
        if(h3){
            let textValue = h3.textContent || h3.innerHTML;
            if(textValue.toLowerCase().indexOf(filter) > -1){
                box[i].style.display = "";
            }
            else{
                box[i].style.display ='none';
            }
        }
    }
}

const genre=document.getElementsByClassName('genre');
const movieList = document.getElementsByClassName('box');
const dropdownBtn= document.getElementById('genre-name');

for(var i=0;i<genre.length;i++){
    genre[i].addEventListener('click',(e)=>{
        e.preventDefault();
        
        const filter= e.target.dataset.filter;
        console.log(filter);

        for(var movie=0;movie<movieList.length;movie++){
            if(filter == 'all'){
                movieList[movie].style.display="block"
            }else{
                if(movieList[movie].classList.contains(filter)){
                    movieList[movie].style.display="block";
                    dropdownBtn.textContent= filter;
                }
                else{
                    movieList[movie].style.display="none";
                }
            }
        }
    })
}


const hamburger= document.getElementById('hamburger');
const navLinks= document.getElementById('navlinks');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('show');
    });
}

(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    const searchInput = document.getElementById('input');
    
    if (searchQuery && searchInput) {
        searchInput.value = searchQuery;
        setTimeout(search, 100);
    }
})();

(function() {
    const setupSuggestions = (inputId, suggestionsId) => {
        const input = document.getElementById(inputId);
        const suggestionsBox = document.getElementById(suggestionsId);

        if (input && suggestionsBox) {
            input.addEventListener('input', async () => {
                const q = input.value.trim();
                if (q.length < 2) {
                    suggestionsBox.style.display = 'none';
                    return;
                }

                try {
                    const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(q)}`);
                    const data = await res.json();
                    if (data.success && data.suggestions.length > 0) {
                        suggestionsBox.innerHTML = '';
                        data.suggestions.forEach(s => {
                            const div = document.createElement('div');
                            div.className = 'suggestion-item';
                            div.textContent = s;
                            div.onclick = () => {
                                input.value = s;
                                suggestionsBox.style.display = 'none';
                                if (inputId === 'hero-input') {
                                    window.location.href = `movies.html?search=${encodeURIComponent(s)}`;
                                } else {
                                    if (typeof search === 'function') search();
                                }
                            };
                            suggestionsBox.appendChild(div);
                        });
                        suggestionsBox.style.display = 'block';
                    } else {
                        suggestionsBox.style.display = 'none';
                    }
                } catch (e) {
                    console.error('Suggestions error:', e);
                }
            });

            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
                    suggestionsBox.style.display = 'none';
                }
            });
        }
    };

    setupSuggestions('hero-input', 'search-suggestions');
    setupSuggestions('input', 'search-suggestions-global'); 
})();

(function() {
    const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('admin') || 'null');
    const navRight = document.querySelector('.nav-right');
    const navLinksList = document.getElementById('navlinks');

    if (user && navLinksList) {
        const wlLi = document.createElement('li');
        wlLi.innerHTML = '<a href="watchlist.html">Watchlist</a>';
        navLinksList.appendChild(wlLi);

        if (navRight) {
            navRight.innerHTML = `
                <li style="color: #01b4e4; font-weight: bold;"><i class="fas fa-user"></i> ${user.name}</li>
                <li><a href="#" id="logout-btn">Logout</a></li>
            `;
            if (user.role === 'admin') {
                const adminLi = document.createElement('li');
                adminLi.className = 'admin-link';
                adminLi.innerHTML = '<a href="admin.html">Admin</a>';
                navRight.appendChild(adminLi);
            }

            document.getElementById('logout-btn').onclick = (e) => {
                e.preventDefault();
                localStorage.removeItem('user');
                localStorage.removeItem('admin');
                window.location.href = 'index.html';
            };
        }
    }
})();