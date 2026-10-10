/* Chronicle — TMDB + AniList search, details and local watchlist. */
(() => {
  'use strict';
  const STORAGE_KEY = 'chronicle-media-watchlist-v1';
  const config = window.CHRONICLE_API_CONFIG || {};
  const isConfigured = () => config.tmdbApiKey && !config.tmdbApiKey.includes('PASTE_YOUR');
  const escapeHTML = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const stripHTML = (value='') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const getWatchlist = () => { try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } };
  const saveWatchlist = items => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); window.dispatchEvent(new CustomEvent('chronicle:watchlist-change')); };
  const keyFor = item => `${item.type}:${item.id}`;
  const isSaved = item => getWatchlist().some(saved => keyFor(saved) === keyFor(item));
  const toggleSaved = item => {
    const list = getWatchlist();
    const key = keyFor(item);
    const exists = list.some(saved => keyFor(saved) === key);
    saveWatchlist(exists ? list.filter(saved => keyFor(saved) !== key) : [item, ...list]);
    return !exists;
  };
  const yearOf = date => date ? String(date).slice(0,4) : '';
  const tmdbImage = path => path ? `${config.tmdbImageBase || 'https://image.tmdb.org/t/p/w500'}${path}` : '';

  async function searchTMDB(query) {
    if (!isConfigured()) throw new Error('Add your TMDB API key in assets/api-config.js first.');
    const url = new URL('https://api.themoviedb.org/3/search/multi');
    url.searchParams.set('api_key', config.tmdbApiKey);
    url.searchParams.set('query', query);
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('language', 'en-US');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TMDB request failed (${response.status}). Check your API key and try again.`);
    const json = await response.json();
    return (json.results || []).filter(x => ['movie','tv'].includes(x.media_type)).map(x => ({
      source:'tmdb', type:x.media_type === 'tv' ? 'tv' : 'movie', id:x.id,
      title:x.title || x.name || 'Untitled', year:yearOf(x.release_date || x.first_air_date),
      poster:tmdbImage(x.poster_path), backdrop:tmdbImage(x.backdrop_path),
      summary:x.overview || 'No overview is available yet.', score:x.vote_average ? Number(x.vote_average).toFixed(1) : '—',
      genres:[], sourceUrl:`https://www.themoviedb.org/${x.media_type}/${x.id}`
    }));
  }

  async function getTMDBDetails(item) {
    if (!isConfigured()) throw new Error('Add your TMDB API key in assets/api-config.js first.');
    const url = new URL(`https://api.themoviedb.org/3/${item.type}/${item.id}`);
    url.searchParams.set('api_key', config.tmdbApiKey);
    url.searchParams.set('language','en-US');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load details (${response.status}).`);
    const d = await response.json();
    return {...item, title:d.title || d.name || item.title, year:yearOf(d.release_date || d.first_air_date) || item.year,
      summary:d.overview || item.summary, score:d.vote_average ? Number(d.vote_average).toFixed(1) : item.score,
      genres:(d.genres || []).map(g=>g.name), runtime:d.runtime || (d.episode_run_time || [])[0] || null,
      status:d.status || '', tagline:d.tagline || '', sourceUrl:`https://www.themoviedb.org/${item.type}/${item.id}`};
  }

  async function searchAniList(query) {
    const graphql = `query ($search: String) { Page(page: 1, perPage: 18) { media(search: $search, type: ANIME, sort: SEARCH_MATCH) { id title { romaji english native } coverImage { large } seasonYear averageScore description(asHtml: false) genres episodes format siteUrl } } }`;
    const response = await fetch('https://graphql.anilist.co', {method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify({query:graphql, variables:{search:query}})});
    if (!response.ok) throw new Error(`AniList request failed (${response.status}). Please try again shortly.`);
    const json = await response.json();
    if (json.errors?.length) throw new Error(json.errors[0].message || 'AniList could not complete the search.');
    return (json.data?.Page?.media || []).map(x=>({
      source:'anilist', type:'anime', id:x.id, title:x.title.english || x.title.romaji || x.title.native || 'Untitled',
      altTitle:x.title.romaji || '', year:x.seasonYear || '', poster:x.coverImage?.large || '', summary:stripHTML(x.description || 'No overview is available yet.'),
      score:x.averageScore ? (x.averageScore/10).toFixed(1) : '—', genres:x.genres || [], episodes:x.episodes || null, format:x.format || '',
      sourceUrl:x.siteUrl || `https://anilist.co/anime/${x.id}`
    }));
  }

  function cardHTML(item) {
    const image = item.poster ? `<img class="media-poster-image" src="${escapeHTML(item.poster)}" alt="${escapeHTML(item.title)} poster" loading="lazy">` : '<div class="media-poster-fallback">No poster<br>available</div>';
    return `<article class="media-card" data-media-key="${escapeHTML(keyFor(item))}">
      <button class="media-card-open" type="button" data-action="details" aria-label="View details for ${escapeHTML(item.title)}">
        <div class="media-poster">${image}<span class="media-score">${escapeHTML(item.score || '—')}</span></div>
        <div class="media-card-copy"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.year || item.format || (item.type==='tv'?'TV':'Anime'))}</p></div>
      </button>
      <button class="media-save" type="button" data-action="save">${isSaved(item) ? '✓ In watchlist' : '+ Watchlist'}</button>
    </article>`;
  }

  function renderResults(container, items, emptyText) {
    if (!items.length) { container.innerHTML = `<p class="media-message">${escapeHTML(emptyText || 'No results found. Try another title.')}</p>`; return; }
    container.innerHTML = items.map(cardHTML).join('');
    container.querySelectorAll('.media-card').forEach(card => {
      const item = items.find(x=>keyFor(x)===card.dataset.mediaKey);
      card.querySelector('[data-action="details"]').addEventListener('click', () => showDetails(item));
      card.querySelector('[data-action="save"]').addEventListener('click', e => {
        const saved = toggleSaved(item);
        e.currentTarget.textContent = saved ? '✓ In watchlist' : '+ Watchlist';
        e.currentTarget.classList.toggle('is-saved', saved);
      });
      const btn = card.querySelector('[data-action="save"]');
      btn.classList.toggle('is-saved', isSaved(item));
    });
  }

  function showDetails(item) {
    const existing = document.getElementById('media-detail-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div'); overlay.id='media-detail-overlay'; overlay.className='media-detail-overlay';
    const image = item.poster ? `<img src="${escapeHTML(item.poster)}" alt="${escapeHTML(item.title)} poster">` : '';
    const genreLine = (item.genres || []).map(escapeHTML).join(' · ');
    overlay.innerHTML = `<section class="media-detail" role="dialog" aria-modal="true" aria-labelledby="media-detail-title">
      <button class="media-detail-close" type="button" aria-label="Close details">×</button>
      <div class="media-detail-layout"><div class="media-detail-art">${image}</div><div class="media-detail-copy">
        <div class="section-label">${item.source==='tmdb'?'The Screen':'The Long Night'} · DETAILS</div>
        <h2 id="media-detail-title">${escapeHTML(item.title)}</h2>
        <p class="media-detail-meta">${escapeHTML(item.year || 'Year unknown')}${item.score && item.score!=='—' ? ` · ★ ${escapeHTML(item.score)}` : ''}${item.episodes ? ` · ${item.episodes} episodes` : ''}${item.runtime ? ` · ${item.runtime} min` : ''}</p>
        ${genreLine?`<p class="media-detail-genres">${genreLine}</p>`:''}${item.tagline?`<p class="media-detail-tagline">${escapeHTML(item.tagline)}</p>`:''}
        <p class="media-detail-summary">${escapeHTML(item.summary || 'No overview is available yet.')}</p>
        <div class="media-detail-actions"><button class="media-save ${isSaved(item)?'is-saved':''}" data-detail-save type="button">${isSaved(item)?'✓ In watchlist':'+ Add to watchlist'}</button><a href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open on ${item.source==='tmdb'?'TMDB':'AniList'} ↗</a></div>
      </div></div></section>`;
    document.body.appendChild(overlay); document.body.style.overflow='hidden';
    const close=()=>{overlay.remove();document.body.style.overflow='';};
    overlay.querySelector('.media-detail-close').addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',esc);}});
    overlay.querySelector('[data-detail-save]').addEventListener('click',e=>{
      const saved=toggleSaved(item); e.currentTarget.textContent=saved?'✓ In watchlist':'+ Add to watchlist'; e.currentTarget.classList.toggle('is-saved',saved);
    });
  }

  function initSearch({formId,inputId,resultsId,statusId,kind}) {
    const form=document.getElementById(formId), input=document.getElementById(inputId), results=document.getElementById(resultsId), status=document.getElementById(statusId);
    if (!form || !input || !results || !status) return;
    form.addEventListener('submit',async e=>{
      e.preventDefault(); const query=input.value.trim();
      if(!query){status.textContent='Enter a title to search.';return;}
      status.textContent=kind==='tmdb'?'Searching TMDB…':'Searching AniList…'; results.innerHTML='<p class="media-message">Looking through the archive…</p>';
      const submit=form.querySelector('button[type="submit"]'); if(submit)submit.disabled=true;
      try { const items=kind==='tmdb'?await searchTMDB(query):await searchAniList(query); renderResults(results,items); status.textContent=`${items.length} result${items.length===1?'':'s'} for “${query}”.`; }
      catch(err){status.textContent=err.message || 'Something went wrong. Try again.';results.innerHTML=`<p class="media-message">${escapeHTML(err.message || 'Something went wrong. Try again.')}</p>`;}
      finally {if(submit)submit.disabled=false;}
    });
  }

  function initWatchlistPage() {
    const container=document.getElementById('saved-media-grid'); if(!container)return;
    const count=document.getElementById('saved-media-count');
    const render=()=>{
      const items=getWatchlist(); if(count)count.textContent=`${items.length} saved ${items.length===1?'title':'titles'}`;
      if(!items.length){container.innerHTML='<p class="media-message">Your watchlist is waiting for its first story. Explore Movies or Anime and tap “+ Watchlist” on anything you want to keep.</p>';return;}
      container.innerHTML=items.map(item=>`<article class="media-card" data-saved-key="${escapeHTML(keyFor(item))}">
        <button class="media-card-open" type="button" data-action="details"><div class="media-poster">${item.poster?`<img class="media-poster-image" src="${escapeHTML(item.poster)}" alt="${escapeHTML(item.title)} poster" loading="lazy">`:'<div class="media-poster-fallback">No poster<br>available</div>'}<span class="media-score">${escapeHTML(item.score||'—')}</span></div><div class="media-card-copy"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.year||item.type)}</p></div></button>
        <button class="media-save is-saved" type="button" data-action="remove">− Remove</button></article>`).join('');
      container.querySelectorAll('.media-card').forEach(card=>{
        const item=items.find(x=>keyFor(x)===card.dataset.savedKey);
        card.querySelector('[data-action="details"]').addEventListener('click',()=>showDetails(item));
        card.querySelector('[data-action="remove"]').addEventListener('click',()=>{saveWatchlist(getWatchlist().filter(x=>keyFor(x)!==keyFor(item)));});
      });
    };
    render(); window.addEventListener('chronicle:watchlist-change',render);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    initSearch({formId:'tmdb-search-form',inputId:'tmdb-search-input',resultsId:'tmdb-results',statusId:'tmdb-status',kind:'tmdb'});
    initSearch({formId:'anilist-search-form',inputId:'anilist-search-input',resultsId:'anilist-results',statusId:'anilist-status',kind:'anilist'});
    initWatchlistPage();
    document.querySelectorAll('[data-watchlist-count]').forEach(el=>el.textContent=getWatchlist().length);
  });
})();
