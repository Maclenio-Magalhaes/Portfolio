/* ==========================================================================
   M'M Dev. Web — Script único do portfólio
   Estrutura:
     0. Tema (corre já no <head>, antes da primeira pintura)
     1. Configuração
     2. Utilitários
     3. Indicador deslizante (dock e filtro)
     4. Navegação ativa (dock)
     5. Revelação ao rolar
     6. Retrato (fallback e luz do cursor)
     7. Cartões de projeto (realce da borda)
     8. Filtro de projetos
     9. Aviso (toast) e copiar contactos
    10. Formulário de contacto (WhatsApp)
    11. Arranque
   ========================================================================== */


/* ==========================================================================
   0. TEMA
   Lê a escolha guardada e aplica data-theme antes de o corpo ser pintado,
   para evitar o "flash" de tema errado. Sem escolha, fica o tema escuro.
   ========================================================================== */
(function aplicarTemaGuardado() {
  try {
    var guardado = localStorage.getItem('mm-tema');
    if (guardado === 'light' || guardado === 'dark') {
      document.documentElement.setAttribute('data-theme', guardado);
    }
  } catch (e) { /* armazenamento indisponível: mantém o tema por omissão */ }
})();


(function () {
  'use strict';

  /* ========================================================================
     1. CONFIGURAÇÃO
     ======================================================================== */
  var CONFIG = {
    // Número de WhatsApp com indicativo de Angola (+244), só dígitos.
    // Confirma que é o mesmo número usado no formulário original.
    whatsapp: '244958283819'
  };


  /* ========================================================================
     2. UTILITÁRIOS
     ======================================================================== */
  var qs  = function (seletor, raiz) { return (raiz || document).querySelector(seletor); };
  var qsa = function (seletor, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(seletor)); };

  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var temHover = window.matchMedia('(hover: hover)').matches;

  // Atrasa a execução de uma função (usado no resize)
  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }


  /* ========================================================================
     TEMA — botão de alternância (claro/escuro)
     ======================================================================== */
  function iniciarTema() {
    var botao = qs('[data-tema-alternar]');
    if (!botao) return;

    var raiz = document.documentElement;
    var atual = function () { return raiz.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; };

    function rotular() {
      botao.setAttribute('aria-label', atual() === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro');
    }

    botao.hidden = false; // o botão só aparece quando o JS está ativo
    rotular();

    botao.addEventListener('click', function () {
      var novo = atual() === 'dark' ? 'light' : 'dark';
      raiz.setAttribute('data-theme', novo);
      try { localStorage.setItem('mm-tema', novo); } catch (e) { /* ignora */ }
      rotular();
    });
  }


  /* ========================================================================
     3. INDICADOR DESLIZANTE
     Cria uma "pílula" que desliza até ao item ativo de um contentor.
     Usada na dock e no filtro de projetos.
     ======================================================================== */
  function criarIndicador(contentor, seletorItem, seletorAtivo) {
    var barra = document.createElement('span');
    barra.className = 'indicador';
    barra.setAttribute('aria-hidden', 'true');
    contentor.appendChild(barra);
    contentor.classList.add('tem-indicador');

    var primeira = true;

    function atualizar() {
      var ativo = qs(seletorAtivo, contentor);
      if (!ativo) { barra.classList.remove('is-pronto'); return; }

      barra.style.setProperty('--ind-x', ativo.offsetLeft + 'px');
      barra.style.setProperty('--ind-w', ativo.offsetWidth + 'px');
      barra.classList.add('is-pronto');

      // A primeira posição é aplicada sem transição
      if (primeira) {
        primeira = false;
        requestAnimationFrame(function () { barra.classList.add('is-animado'); });
      }
    }

    // Reposiciona quando o tamanho muda (rotação do ecrã, fontes, etc.)
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(atualizar);
      ro.observe(contentor);
      qsa(seletorItem, contentor).forEach(function (el) { ro.observe(el); });
    } else {
      window.addEventListener('resize', debounce(atualizar, 100));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(atualizar);

    atualizar();
    return { atualizar: atualizar };
  }


  /* ========================================================================
     4. NAVEGAÇÃO ATIVA (DOCK)
     - Páginas interiores: o item da página já vem com aria-current="page".
     - Página inicial: acompanha a secção visível (Início / Sobre mim).
     ======================================================================== */
  function iniciarDock() {
    var pista = qs('.dock__track');
    if (!pista) return;

    var indicador = criarIndicador(pista, '.dock__item', '.dock__item[aria-current]');
    var itens = qsa('.dock__item[href^="#"]', pista); // ligações internas (só na página inicial)
    if (!itens.length) return;

    // Marca como ativo o item cuja âncora corresponde ao id indicado
    function definirAtivo(id) {
      itens.forEach(function (item) {
        if (item.getAttribute('href') === '#' + id) item.setAttribute('aria-current', 'location');
        else item.removeAttribute('aria-current');
      });
      indicador.atualizar();
    }

    // Resposta imediata ao toque/clique
    itens.forEach(function (item) {
      item.addEventListener('click', function () { definirAtivo(item.getAttribute('href').slice(1)); });
    });

    // Estado inicial: respeita o hash do URL (ex.: index.html#Sobre)
    var hash = location.hash.slice(1);
    if (hash && document.getElementById(hash)) definirAtivo(hash);

    // Acompanha a secção que atravessa o meio do ecrã
    var secoes = itens
      .map(function (item) { return qs(item.getAttribute('href')); })
      .filter(Boolean);

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) { if (e.isIntersecting) definirAtivo(e.target.id); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secoes.forEach(function (s) { obs.observe(s); });
    }

    // No topo da página volta sempre a "Início"
    window.addEventListener('scroll', function () {
      if (window.scrollY < 40 && secoes[0]) definirAtivo(secoes[0].id);
    }, { passive: true });
  }


  /* ========================================================================
     5. REVELAÇÃO AO ROLAR
     Só os blocos que começam fora do ecrã recebem a animação, por isso
     nada pisca no carregamento e, sem JS, o conteúdo fica sempre visível.
     ======================================================================== */
  function iniciarRevelacao() {
    if (movimentoReduzido || !('IntersectionObserver' in window)) return;

    var alvos = qsa('[data-revelar]').filter(function (el) {
      return el.getBoundingClientRect().top > window.innerHeight * 0.95;
    });
    if (!alvos.length) return;

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visivel');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    alvos.forEach(function (el, i) {
      el.style.setProperty('--atraso', (i % 3) * 80 + 'ms'); // pequeno escalonamento
      el.classList.add('reveal');
      obs.observe(el);
    });
  }


  /* ========================================================================
     6. RETRATO — fallback se a fotografia não carregar + luz do cursor
     ======================================================================== */
  function iniciarRetrato() {
    var retrato = qs('.portrait');
    if (!retrato) return;

    var img = qs('img', retrato);
    function marcarAusente() { retrato.classList.add('is-missing'); }

    if (img) {
      if (img.complete && img.naturalWidth === 0) marcarAusente();
      img.addEventListener('error', marcarAusente);
    }

    if (temHover && !movimentoReduzido) {
      retrato.addEventListener('pointermove', function (e) {
        var r = retrato.getBoundingClientRect();
        retrato.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100) + '%');
        retrato.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    }
  }


  /* ========================================================================
     7. CARTÕES DE PROJETO — realce da borda junto ao cursor
     ======================================================================== */
  function iniciarCartoes() {
    var grelha = qs('[data-projetos]');
    if (!grelha || !temHover) return;

    grelha.addEventListener('pointermove', function (e) {
      var cartao = e.target.closest('.card');
      if (!cartao) return;
      var r = cartao.getBoundingClientRect();
      cartao.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      cartao.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }


  /* ========================================================================
     8. FILTRO DE PROJETOS
     Os botões [data-filtro] mostram/escondem os cartões pela categoria
     definida em data-categoria. O contador é atualizado para leitores de ecrã.
     ======================================================================== */
  function iniciarFiltro() {
    var barra   = qs('[data-filtros]');
    var grelha  = qs('[data-projetos]');
    if (!barra || !grelha) return;

    var botoes   = qsa('[data-filtro]', barra);
    var cartoes  = qsa('.card', grelha);
    var contador = qs('[data-contador]');
    var total    = cartoes.length;

    barra.hidden = false; // os filtros só aparecem quando o JS está ativo
    var indicador = criarIndicador(barra, '[data-filtro]', '[aria-pressed="true"]');

    function textoContador(visiveis) {
      var projetos = total === 1 ? 'projeto' : 'projetos';
      return visiveis === total
        ? total + ' ' + projetos
        : 'A mostrar ' + visiveis + ' de ' + total + ' ' + projetos;
    }
    if (contador) contador.textContent = textoContador(total);

    function aplicar(filtro) {
      var visiveis = 0;
      cartoes.forEach(function (c) {
        var mostrar = filtro === 'todos' || c.dataset.categoria === filtro;
        c.hidden = !mostrar;
        if (mostrar) visiveis++;
      });
      if (contador) contador.textContent = textoContador(visiveis);
    }

    botoes.forEach(function (botao) {
      botao.addEventListener('click', function () {
        if (botao.getAttribute('aria-pressed') === 'true') return;

        botoes.forEach(function (b) { b.setAttribute('aria-pressed', String(b === botao)); });
        indicador.atualizar();

        // Pequeno desvanecimento ao trocar de conjunto
        if (movimentoReduzido) { aplicar(botao.dataset.filtro); return; }
        grelha.classList.add('is-trocando');
        setTimeout(function () {
          aplicar(botao.dataset.filtro);
          grelha.classList.remove('is-trocando');
        }, 160);
      });
    });
  }


  /* ========================================================================
     9. AVISO (TOAST) E COPIAR CONTACTOS
     ======================================================================== */
  var aviso, temporizadorAviso;

  function mostrarAviso(texto) {
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.className = 'toast';
      aviso.setAttribute('role', 'status');
      aviso.setAttribute('aria-live', 'polite');
      document.body.appendChild(aviso);
    }
    aviso.innerHTML = '<span class="icon icon--check" aria-hidden="true"></span>';
    aviso.appendChild(document.createTextNode(texto));
    // Dois frames para a transição de entrada correr sempre
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { aviso.classList.add('is-visivel'); });
    });
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { aviso.classList.remove('is-visivel'); }, 2200);
  }

  // Copia para a área de transferência (com alternativa para navegadores antigos)
  function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto);
    }
    return new Promise(function (resolve, reject) {
      var campo = document.createElement('textarea');
      campo.value = texto;
      campo.setAttribute('readonly', '');
      campo.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(campo);
      campo.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* ignora */ }
      document.body.removeChild(campo);
      ok ? resolve() : reject();
    });
  }

  function iniciarCopiar() {
    qsa('[data-copiar]').forEach(function (botao) {
      var icone = qs('.icon', botao);

      botao.addEventListener('click', function () {
        copiarTexto(botao.dataset.copiar).then(function () {
          mostrarAviso(botao.dataset.copiarMsg || 'Copiado');
          botao.classList.add('is-feito');
          if (icone) { icone.classList.remove('icon--copy'); icone.classList.add('icon--check'); }
          setTimeout(function () {
            botao.classList.remove('is-feito');
            if (icone) { icone.classList.remove('icon--check'); icone.classList.add('icon--copy'); }
          }, 1600);
        }).catch(function () {
          mostrarAviso('Não foi possível copiar. Copie manualmente.');
        });
      });
    });
  }


  /* ========================================================================
     10. FORMULÁRIO DE CONTACTO (WhatsApp)
     Valida os campos e abre uma conversa no WhatsApp com a mensagem pronta.
     Mantém os ids originais: #nome, #mensagem, #btn-whatsapp, #form-feedback.
     ======================================================================== */
  function iniciarFormulario() {
    var form = qs('#contacto-form');
    if (!form) return;

    var campoNome     = qs('#nome');
    var campoMensagem = qs('#mensagem');
    var feedback      = qs('#form-feedback');

    function erroDe(campo) { return qs('#' + campo.id + '-erro'); }

    function definirErro(campo, texto) {
      var alvo = erroDe(campo);
      if (alvo) alvo.textContent = texto;
      if (texto) campo.setAttribute('aria-invalid', 'true');
      else campo.removeAttribute('aria-invalid');
    }

    // Limpa o erro assim que a pessoa volta a escrever
    [campoNome, campoMensagem].forEach(function (campo) {
      campo.addEventListener('input', function () { definirErro(campo, ''); feedback.textContent = ''; });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      feedback.className = 'form-feedback';
      feedback.textContent = '';

      var nome = campoNome.value.trim();
      var mensagem = campoMensagem.value.trim();

      definirErro(campoNome, nome ? '' : 'Preencha o seu nome.');
      definirErro(campoMensagem, mensagem ? '' : 'Escreva a sua mensagem.');

      // Foca o primeiro campo inválido
      if (!nome)     { campoNome.focus(); return; }
      if (!mensagem) { campoMensagem.focus(); return; }

      var texto = 'Olá, o meu nome é ' + nome + '.\n\n' + mensagem;
      var url = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(texto);

      // Abre num novo separador através de uma ligação temporária (mais fiável em telemóveis)
      var ligacao = document.createElement('a');
      ligacao.href = url;
      ligacao.target = '_blank';
      ligacao.rel = 'noopener noreferrer';
      document.body.appendChild(ligacao);
      ligacao.click();
      document.body.removeChild(ligacao);

      feedback.classList.add('is-ok');
      feedback.textContent = 'A abrir o WhatsApp com a sua mensagem. ';
      var alternativa = document.createElement('a');
      alternativa.href = url;
      alternativa.target = '_blank';
      alternativa.rel = 'noopener noreferrer';
      alternativa.textContent = 'Não abriu? Toque aqui.';
      feedback.appendChild(alternativa);
    });
  }


  /* ========================================================================
     11. ARRANQUE
     ======================================================================== */
  function iniciar() {
    // Ano atual no footer
    qsa('[data-ano]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

    iniciarTema();
    iniciarDock();
    iniciarRevelacao();
    iniciarRetrato();
    iniciarCartoes();
    iniciarFiltro();
    iniciarCopiar();
    iniciarFormulario();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
