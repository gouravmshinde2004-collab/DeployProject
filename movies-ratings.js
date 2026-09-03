(function() {
  const modal = document.getElementById('movie-modal');
  const modalDetails = document.getElementById('modal-details');
  const closeModal = document.querySelector('.close-modal');

  if (closeModal) {
    closeModal.onclick = function() {
      modal.style.display = 'none';
    };
  }

  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  };

  function getLoggedInUser() {
    try {
      var u = localStorage.getItem('user') || localStorage.getItem('admin');
      return u ? JSON.parse(u) : null;
    } catch (e) { return null; }
  }

  function starStr(n) {
    var s = '';
    for (var i = 0; i < 5; i++) {
      s += i < n ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    }
    return s;
  }

  function loadRatings(movieKey, widgetEl) {
    widgetEl.innerHTML = '<span class="count">Loading…</span>';
    fetch('/api/ratings?movie_key=' + encodeURIComponent(movieKey))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var user = getLoggedInUser();
        var avg = data.average || 0;
        var count = data.count || 0;
        var stars = starStr(Math.round(avg));
        
        widgetEl.innerHTML =
          '<div class="rating-summary">' +
            '<span class="stars">' + stars + '</span>' +
            '<span class="count">' + (count ? avg.toFixed(1) + ' (' + count + ')' : 'No ratings') + '</span>' +
          '</div>';

        if (user) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'rate-btn';
          btn.textContent = 'Rate this';
          btn.onclick = function(e) { 
            e.stopPropagation(); 
            showForm(movieKey, widgetEl, user); 
          };
          widgetEl.appendChild(btn);
        }
      })
      .catch(function() {
        widgetEl.innerHTML = '<span class="count">Ratings unavailable</span>';
      });
  }

  function showForm(movieKey, widgetEl, user) {
    var chosen = 0;
    widgetEl.innerHTML = 
      '<form class="rating-form">' +
        '<div class="star-select">' +
          '<span data-r="1"><i class="far fa-star"></i></span>' +
          '<span data-r="2"><i class="far fa-star"></i></span>' +
          '<span data-r="3"><i class="far fa-star"></i></span>' +
          '<span data-r="4"><i class="far fa-star"></i></span>' +
          '<span data-r="5"><i class="far fa-star"></i></span>' +
        '</div>' +
        '<textarea placeholder="Write your review here..." rows="3" class="review-text"></textarea>' +
        '<button type="submit">Submit Review</button>' +
        '<div class="form-msg"></div>' +
      '</form>';

    widgetEl.querySelectorAll('.star-select span').forEach(function(span) {
      span.addEventListener('click', function(e) {
        e.stopPropagation();
        chosen = parseInt(span.dataset.r, 10);
        widgetEl.querySelectorAll('.star-select span').forEach(function(s) {
          var r = parseInt(s.dataset.r, 10);
          s.classList.toggle('active', r <= chosen);
          var icon = s.querySelector('i');
          if (icon) icon.className = r <= chosen ? 'fas fa-star' : 'far fa-star';
        });
      });
    });

    var form = widgetEl.querySelector('.rating-form');
    var msgEl = widgetEl.querySelector('.form-msg');

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      e.stopPropagation();

      if (chosen < 1 || chosen > 5) {
        msgEl.textContent = 'Please select a star rating';
        msgEl.style.color = '#ff6b6b';
        return;
      }

      var reviewText = (widgetEl.querySelector('.review-text') || {}).value || '';
      
      fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          movie_key: movieKey,
          rating: chosen,
          review_text: reviewText
        })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            msgEl.textContent = 'Thank you for your review!';
            msgEl.style.color = '#51cf66';
            setTimeout(function() {
              loadRatings(movieKey, widgetEl);
              if (modal.style.display === 'block') {
                var currentModalTitle = modalDetails.querySelector('.modal-movie-title');
                if (currentModalTitle && currentModalTitle.textContent.includes(movieKey)) {
                  var boxEl = Array.from(document.querySelectorAll('.box')).find(b => b.dataset.movieKey === movieKey);
                  if (boxEl) showMovieDetails(movieKey, boxEl);
                }
              }
            }, 1000);
          } else {
            msgEl.textContent = data.message || 'Failed to post review';
            msgEl.style.color = '#ff6b6b';
          }
        })
        .catch(function() {
          msgEl.textContent = 'Connection error. Please try again.';
          msgEl.style.color = '#ff6b6b';
        });
    });
  }

  function showMovieDetails(movieKey, boxEl) {
    if (!modal || !modalDetails) return;
    
    var fallbackImg = '';
    var fallbackDesc = '';
    if (boxEl) {
        var img = boxEl.querySelector('img');
        if (img) fallbackImg = img.src;
        var textDiv = boxEl.querySelector('.text');
        if (textDiv) {
            var p = textDiv.querySelector('p:not(.genre)');
            if (!p) {
                var lines = textDiv.innerText.split('\n');
                if (lines.length > 1) fallbackDesc = lines.slice(1).join('\n').trim();
            } else {
                fallbackDesc = p.innerText.trim();
            }
        }
    }

    modalDetails.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading details...</div>';
    modal.style.display = 'block';

    fetch('/api/movie-details?movie_key=' + encodeURIComponent(movieKey))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.success) {
          modalDetails.innerHTML = '<div style="padding: 40px; text-align: center;">Failed to load movie details.</div>';
          return;
        }

        var info = data.info || { title: movieKey, description: fallbackDesc || 'No description available.', genre: 'N/A', release_date: 'N/A', image_url: fallbackImg };
        var avg = data.average || 0;
        var count = data.count || 0;
        var stars = starStr(Math.round(avg));
        
        var bannerImg = info.image_url || fallbackImg || 'images/front3.jpg';
        var posterImg = info.image_url || fallbackImg || 'images/logo.jpg';
        
        var html = 
          '<div class="modal-banner" style="background-image: url(\'' + bannerImg + '\');">' +
            '<div class="modal-banner-content">' +
              '<img src="' + posterImg + '" class="modal-poster">' +
              '<div class="modal-details-info">' +
                '<h2 class="modal-movie-title">' + info.title + '</h2>' +
                '<div class="modal-meta">' +
                  '<span><i class="fas fa-calendar"></i> ' + (info.release_date || 'N/A') + '</span>' +
                  '<span><i class="fas fa-tag"></i> ' + (info.genre || 'N/A') + '</span>' +
                '</div>' +
                '<div class="modal-section-title">Overview</div>' +
                '<p class="modal-description">' + (info.description || fallbackDesc || 'No description available.') + '</p>' +
                '<div class="modal-stats">' +
                  '<div class="stat-item">' +
                    '<h4>Average Rating</h4>' +
                    '<p><span class="stars" style="color: #fab752;">' + stars + '</span> ' + (count ? avg.toFixed(1) : 'No ratings') + '</p>' +
                  '</div>' +
                  '<div class="stat-item">' +
                    '<h4>Reviews</h4>' +
                    '<p>' + count + ' total reviews</p>' +
                  '</div>' +
                '</div>' +
                '<div style="margin-top: 30px;">' +
                  '<button class="rate-btn" style="background:#01b4e4; color:white; border:none; padding:10px 20px; border-radius:20px; font-weight:bold; cursor:pointer;" onclick="window.open(\'https://www.youtube.com/results?search_query=\' + encodeURIComponent(\'' + info.title + ' trailer\'), \'_blank\')">' +
                    '<i class="fas fa-play"></i> Watch Trailer' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">' +
              '<div>' +
                '<h3 class="modal-section-title">User Reviews</h3>' +
                '<div class="reviews-list">';

        if (data.reviews && data.reviews.length > 0) {
          data.reviews.forEach(function(rev) {
            html += 
              '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid #01b4e4;">' +
                '<div style="display: flex; justify-content: space-between; margin-bottom: 5px;">' +
                  '<strong>' + rev.user_name + '</strong>' +
                  '<span style="color: #fab752;">' + starStr(rev.rating) + '</span>' +
                '</div>' +
                '<p style="font-size: 0.9rem; color: #ccc;">' + (rev.review_text || 'No comments.') + '</p>' +
                '<small style="color: #666;">' + new Date(rev.created_at).toLocaleDateString() + '</small>' +
              '</div>';
          });
        } else {
          html += '<p style="color: #999;">No reviews yet. Be the first to review!</p>';
        }

        html += 
                '</div>' +
              '</div>' +
              '<div>' +
                '<h3 class="modal-section-title">Add Your Review</h3>' +
                '<div id="modal-rating-container"></div>' +
              '</div>' +
            '</div>' +
          '</div>';

        modalDetails.innerHTML = html;

        var user = getLoggedInUser();
        var rateContainer = document.getElementById('modal-rating-container');
        if (user) {
          showForm(movieKey, rateContainer, user);
        } else {
          rateContainer.innerHTML = '<p style="color: #999;">Please <a href="login.html" style="color: #01b4e4;">login</a> to rate and review this movie.</p>';
        }
      })
      .catch(function(err) {
        console.error('Error loading movie details:', err);
        modalDetails.innerHTML = '<div style="padding: 40px; text-align: center;">Connection error. Please try again later.</div>';
      });
  }

  window.showMovieDetails = showMovieDetails;

  function initBoxRatings(box) {
    var h3 = box.querySelector('.text h3');
    var movieKey = (h3 && h3.textContent || '').trim().replace(/\s+/g, ' ').trim();
    if (!movieKey) return;
    box.dataset.movieKey = movieKey;

    box.addEventListener('click', function(e) {
      if (e.target.closest('.rating-widget') || e.target.closest('.watchlist-btn')) return;
      showMovieDetails(movieKey, box);
    });

    var widget = document.createElement('div');
    widget.className = 'rating-widget';
    box.appendChild(widget);
    loadRatings(movieKey, widget);

    var user = getLoggedInUser();
    if (user) {
      var wlBtn = document.createElement('div');
      wlBtn.className = 'watchlist-btn';
      wlBtn.innerHTML = '<i class="far fa-bookmark"></i>';
      wlBtn.title = 'Add to Watchlist';
      box.appendChild(wlBtn);

      fetch('/api/watchlist?user_id=' + user.id)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success && data.watchlist.includes(movieKey)) {
            wlBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
            wlBtn.classList.add('active');
            wlBtn.title = 'In Watchlist';
          }
        });

      wlBtn.onclick = function(e) {
        e.stopPropagation();
        var isActive = wlBtn.classList.contains('active');
        var action = isActive ? 'remove' : 'add';
        fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, movie_key: movieKey, action: action })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            wlBtn.classList.toggle('active');
            wlBtn.innerHTML = wlBtn.classList.contains('active') ? '<i class="fas fa-bookmark"></i>' : '<i class="far fa-bookmark"></i>';
            wlBtn.title = wlBtn.classList.contains('active') ? 'In Watchlist' : 'Add to Watchlist';
          }
        });
      };
    }
  }

  window.initBoxRatings = initBoxRatings;

  function scanForBoxes() {
    var boxes = document.querySelectorAll('.box:not([data-movie-key])');
    boxes.forEach(function(box) {
      initBoxRatings(box);
    });
  }

  scanForBoxes();

  setInterval(scanForBoxes, 1000);

})();
