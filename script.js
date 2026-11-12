$(function () {
  var carrinho = [];
  var hoje = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  function moeda(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /* Carrinho de compras */
  function renderizar() {
    var $lista = $('#lista-carrinho').empty(), total = 0, itens = 0;
    $.each(carrinho, function (i, it) {
      total += it.preco * it.qtd;
      itens += it.qtd;
      $lista.append(
        '<li class="carrinho__item" data-i="' + i + '">' +
          '<div><strong>' + it.nome + '</strong><br><span>' + moeda(it.preco) + ' cada</span></div>' +
          '<div class="qtd">' +
            '<button type="button" class="qtd__btn" data-acao="menos" aria-label="Diminuir ' + it.nome + '">−</button>' +
            '<span>' + it.qtd + '</span>' +
            '<button type="button" class="qtd__btn" data-acao="mais" aria-label="Aumentar ' + it.nome + '">+</button>' +
          '</div>' +
          '<p class="carrinho__sub">' + moeda(it.preco * it.qtd) + '</p>' +
          '<button type="button" class="carrinho__remover" data-acao="remover" aria-label="Remover ' + it.nome + '">Remover</button>' +
        '</li>'
      );
    });
    $('#carrinho-vazio').toggle(carrinho.length === 0);
    $('#total').text(moeda(total));
    $('#contador').text(itens);
  }

  $('.botao--add').on('click', function () {
    var $b = $(this), nome = $b.data('nome'), preco = parseFloat($b.data('preco'));
    var item = carrinho.filter(function (x) { return x.nome === nome; })[0];
    if (item) { item.qtd++; } else { carrinho.push({ nome: nome, preco: preco, qtd: 1 }); }
    renderizar();
    $b.text('Adicionado ✓');
    setTimeout(function () { $b.text('Adicionar'); }, 900);
  });

  $('#lista-carrinho').on('click', 'button', function () {
    var i = $(this).closest('li').data('i'), acao = $(this).data('acao');
    if (acao === 'mais') { carrinho[i].qtd++; }
    else if (acao === 'menos') { carrinho[i].qtd--; }
    else { carrinho[i].qtd = 0; }
    if (carrinho[i].qtd <= 0) { carrinho.splice(i, 1); }
    renderizar();
    $('#lista-carrinho li').eq(i).find('[data-acao="' + acao + '"]').focus();
  });

  /* Mensagens de erro nos campos */
  function limpar($el) {
    $el.removeClass('invalido').removeAttr('aria-invalid aria-describedby').next('.erro').remove();
  }
  function erro($el, msg) {
    limpar($el);
    var id = 'erro-' + $el.attr('id');
    $el.addClass('invalido').attr({ 'aria-invalid': 'true', 'aria-describedby': id });
    $('<span class="erro"></span>').attr('id', id).text(msg).insertAfter($el);
  }

  /* Máscaras: telefone e CEP */
  $('input[type="tel"]').on('input', function () {
    var d = this.value.replace(/\D/g, '').slice(0, 11);
    this.value = d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      : d.length > 6 ? d.replace(/(\d{2})(\d{4})(\d*)/, '($1) $2-$3')
      : d.length > 2 ? d.replace(/(\d{2})(\d*)/, '($1) $2') : d;
  });

  $('#pedido-cep').on('input', function () {
    var d = this.value.replace(/\D/g, '').slice(0, 8);
    this.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
    if (d.length === 8) { buscarCep(d); }
  });

  /* CEP: consulta a API ViaCEP e preenche o endereço */
  function buscarCep(cep) {
    var $cep = $('#pedido-cep');
    $.getJSON('https://viacep.com.br/ws/' + cep + '/json/')
      .done(function (d) {
        if (d.erro) { erro($cep, 'CEP não encontrado. Confira os números.'); return; }
        limpar($cep);
        $('#pedido-rua').val(d.logradouro);
        $('#pedido-bairro').val(d.bairro);
        $('#pedido-cidade').val(d.localidade);
        $('#pedido-uf').val(d.uf);
        $('#pedido-rua, #pedido-bairro, #pedido-cidade, #pedido-uf').each(function () { limpar($(this)); });
        $('#pedido-numero').focus();
      })
      .fail(function () {
        erro($cep, 'Não foi possível consultar o CEP. Preencha o endereço manualmente.');
      });
  }

  /* Validação dos formulários */
  $('#data').attr('min', hoje);

  function checar($el, v) {
    var tipo = $el.attr('type'), digitos = v.replace(/\D/g, '');
    if (tipo === 'tel' && digitos.length < 10) { return 'Informe o DDD e o número. Ex.: (00) 90000-0000.'; }
    if ($el.attr('id') === 'pedido-cep' && digitos.length !== 8) { return 'O CEP deve ter 8 números.'; }
    if (tipo === 'date' && v < hoje) { return 'Escolha uma data a partir de hoje.'; }
    if (!$el[0].checkValidity()) { return $el[0].validationMessage; }
    return '';
  }

  function validar($form) {
    var res = { vazios: [], invalidos: [] };
    $form.find('input, select, textarea').each(function () {
      var $el = $(this), v = $.trim($el.val()), id = $el.attr('id');
      var rotulo = $form.find('label[for="' + id + '"]').text().replace(' (opcional)', '');
      limpar($el);
      if ($el.prop('required') && v === '') {
        res.vazios.push(rotulo);
        erro($el, 'Preencha este campo.');
      } else if (v !== '') {
        var msg = checar($el, v);
        if (msg) { res.invalidos.push(rotulo); erro($el, msg); }
      }
    });
    return res;
  }

  function alerta($form, tipo, texto) {
    var $a = $form.find('.alerta');
    $a.attr('class', 'alerta alerta--' + tipo).text(texto).prop('hidden', false);
    $a[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  $('.formulario').prepend('<div class="alerta" role="alert" hidden></div>');

  $('.formulario').on('input change', 'input, select, textarea', function () {
    limpar($(this));
  });

  $('.formulario').on('submit', function (e) {
    e.preventDefault();
    var $f = $(this), pedido = $f.is('#form-pedido'), res = validar($f), msgs = [];

    if (pedido && carrinho.length === 0) { msgs.push('Seu carrinho está vazio. Adicione um item do cardápio.'); }
    if (res.vazios.length) { msgs.push('Preencha os campos obrigatórios: ' + res.vazios.join(', ') + '.'); }
    if (res.invalidos.length) { msgs.push('Corrija: ' + res.invalidos.join(', ') + '.'); }

    if (msgs.length) {
      alerta($f, 'erro', 'Não foi possível enviar. ' + msgs.join(' '));
      var $primeiro = $f.find('.invalido').first();
      if ($primeiro.length) { $primeiro[0].focus({ preventScroll: true }); }
      return;
    }

    var texto;
    if (pedido) {
      var qtd = 0, total = 0;
      $.each(carrinho, function (i, it) { qtd += it.qtd; total += it.preco * it.qtd; });
      texto = 'Pedido enviado! ' + qtd + (qtd === 1 ? ' item' : ' itens') + ', total de ' + moeda(total) +
        '. Entrega em ' + $('#pedido-rua').val() + ', ' + $('#pedido-numero').val() + '.';
      carrinho = [];
      renderizar();
    } else {
      var d = $('#data').val().split('-');
      texto = 'Reserva solicitada para ' + d[2] + '/' + d[1] + ' às ' + $('#hora').val() +
        '. Confirmaremos por telefone ou e-mail.';
    }
    $f[0].reset();
    alerta($f, 'ok', texto);
  });

  renderizar();
});
