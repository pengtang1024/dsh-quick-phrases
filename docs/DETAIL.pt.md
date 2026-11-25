# Frases rápidas

## O que faz

Adiciona uma linha de botões de frase (`继续`, `提交`, `推送`, `发版` …) ao lado do campo de entrada. Um clique envia diretamente o **texto** da frase; o botão mostra apenas o seu **rótulo**. Os dois são editados separadamente, de modo que o botão pode ser curto enquanto a mensagem enviada é uma frase completa.

**O comportamento ao clicar é configurável** (por padrão: enviar diretamente):

- **Enviar diretamente (padrão)**: com o campo de entrada vazio e sem anexos, um único clique envia a frase.
- **Preencher o campo de entrada**: apenas escreve o texto no rascunho; enviar ou não fica a seu critério.

Em ambos os modos, se o campo de entrada **já contiver texto que você estava escrevendo ou anexos**, o clique não os substitui — a frase é inserida na posição do cursor.

## Onde fica a linha

A posição da linha de frases pode ser alterada a qualquer momento na página de configurações; a mudança entra em vigor imediatamente:

| Posição | Slot | Observações |
| --- | --- | --- |
| Abaixo do campo de entrada (padrão) | `conversation.composer.dock` | Uma linha completa abaixo do cartão de entrada; é a mais espaçosa, ideal para muitas frases. |
| Acima do campo de entrada | `conversation.input.dock` | Uma linha completa acima do cartão de entrada. Sua largura e centralização seguem a geometria do cartão dock do host (`--dsh-composer-card-max-width` / `--dsh-composer-side-clearance` / `--dsh-composer-dock-inset`), alinhando-se às bordas internas do cartão; ela também fica acima da fila e do painel de tarefas, para não separá-los do cartão. |
| À direita da linha de ferramentas | `conversation.input.right` | Dentro da linha de ferramentas do campo de entrada (`+`, permissões, seletor de modelo), para manter os botões perto do cursor; o espaço é limitado, então a linha rola horizontalmente. |

As três linhas são registradas, mas apenas a selecionada é renderizada — trocar é um redesenho, não um recarregamento da página.

## Recolher e ocultar

A linha de frases não deve atrapalhar a digitação, então pode ser recolhida temporariamente e sua forma habitual é uma configuração:

- **Recolher manualmente**: clique em `收起 ▾` no fim da linha e ela se reduz a uma pequena pílula `▸ 快捷短语`; clique na pílula para expandi-la temporariamente e novamente em «收起» para recolhê-la.
- **Recolher automaticamente** (padrão): com «Quando o campo de entrada tem texto» definido como «Recolher automaticamente», a linha se reduz à pílula assim que há texto ou anexos no campo, e se expande quando o rascunho é esvaziado. Escolha «Manter visível» para manter a linha completa.

Depois de expandir a pílula, clicar em uma frase funciona exatamente como com a linha aberta: se o campo já tiver conteúdo, o texto é inserido no cursor e o rascunho não é substituído.

O menu suspenso **Exibição da linha de frases** nas configurações resume a forma habitual em três opções:

- **Mostrar a linha completa**: a linha permanece visível e o «收起» no fim ainda pode recolhê-la temporariamente;
- **Recolher em pílula**: resta apenas uma pequena pílula ao lado do campo de entrada; clique nela para expandir;
- **Ocultar completamente**: a linha desaparece por inteiro da interface — **nem a pílula permanece**, nada é mostrado. A única volta é em **Configurações → Frases rápidas**, trocando o menu para uma das duas primeiras opções (ao escolher «Ocultar completamente», a indicação «整排已隐藏» aparece ao lado). Voltar para «Mostrar a linha completa» também limpa o estado recolhido e restaura a linha completa diretamente.

O botão `收起 ▾` no fim da linha equivale a escolher «Recolher em pílula». Esse menu não armazena estado próprio: seu valor é derivado de `dsh.quick-phrases.hidden.v1` (que tem prioridade) e `dsh.quick-phrases.collapsed.v1`, e a troca grava ambas as chaves existentes.

Uma frase específica pode ser ocultada pelo interruptor de **olho** em seu cartão no gerenciador: o botão desaparece da linha, mas o cartão permanece no gerenciador marcado como «已隐藏»; clique novamente para restaurá-la.

## Gerenciar frases

Abra **Configurações → Frases rápidas**. A página tem duas partes: cinco configurações de comportamento em cima, a lista de frases embaixo.

**Configurações de comportamento** (aplicadas ao selecionar, sem reiniciar). Valores, valor padrão e efeito das cinco:

| Opção | Valores | Padrão | Efeito |
| --- | --- | --- | --- |
| Posição de exibição | Abaixo do campo / Acima do campo / À direita da linha de ferramentas | Abaixo do campo | Determina em qual slot a linha aparece; ao trocar, ela se move imediatamente. Os detalhes de cada posição estão em «Onde fica a linha», acima. |
| Ao clicar em uma frase | Enviar diretamente / Preencher o campo de entrada | Enviar diretamente | «Enviar diretamente» envia a frase com um clique quando o campo está vazio e não há anexos; «Preencher o campo de entrada» apenas escreve o texto no rascunho. Em ambos os modos, texto ou anexos existentes são preservados e a frase é inserida no cursor. |
| Exibição da linha de frases | Mostrar a linha completa / Recolher em pílula / Ocultar completamente | Mostrar a linha completa | Controla a forma habitual: «Recolher em pílula» deixa apenas uma pílula expansível; «Ocultar completamente» não renderiza nada, nem a pílula, e só pode ser revertido nesta página. Escolher «Mostrar a linha completa» também limpa o estado recolhido. Veja «Recolher e ocultar», acima. |
| Entrada de gerenciamento | Botão de texto / Ícone de engrenagem / Ocultar entrada | Botão de texto | Aparência do botão «Gerenciar» no fim da linha. O ícone de engrenagem mantém o nome acessível «Gerenciar» e o mesmo comportamento de clique; «Ocultar entrada» não renderiza o botão, mas a linha continua funcionando e esta página continua acessível por aqui. |
| Quando o campo de entrada tem texto | Recolher automaticamente / Manter visível | Recolher automaticamente | Se a linha se reduz à pílula quando há rascunho ou anexos. «Recolher automaticamente» a expande quando o rascunho é esvaziado; «Manter visível» mantém a linha completa. |

**Lista de frases** (um cartão por frase):

- **Arrastar para reordenar**: segure a alça à esquerda e arraste o cartão para cima ou para baixo; ao soltar, ele ocupa a nova posição. Também é possível movê-lo um passo por vez com **↑ / ↓** à direita do cartão. A ordem da lista é a ordem dos botões na linha, da esquerda para a direita.
- **Rótulo**: a primeira linha do cartão é o texto do botão; clique para editar diretamente (por exemplo `提交`).
- **Texto a enviar**: o campo grande abaixo, com suporte a várias linhas.
- **Prévia do botão**: no rodapé de cada cartão, uma prévia em tempo real mostra como o botão fica e quantos caracteres ele envia, para perceber se o rótulo está largo demais.
- **Olho**: oculta ou restaura a frase. Oculto, o botão desaparece da linha e o cartão permanece no gerenciador com o selo «已隐藏».
- **✕**: o primeiro clique apenas transforma o botão em «Confirmar»; um segundo clique em até quatro segundos realmente exclui a frase, evitando exclusões acidentais.
- **Adicionar frase** acrescenta um cartão vazio e coloca o cursor no rótulo; **Restaurar padrões** entra no estado de confirmação no primeiro clique e restaura as quatro frases integradas no segundo.

As alterações são salvas e aplicadas imediatamente, sem reiniciar. As frases ficam no armazenamento local do navegador (chave `localStorage` `dsh.quick-phrases.v1`; a posição em `dsh.quick-phrases.placement.v1`, o comportamento de clique em `dsh.quick-phrases.click.v1`, o estado recolhido em `dsh.quick-phrases.collapsed.v1`, a opção de recolhimento automático em `dsh.quick-phrases.autohide.v1`, o estado de ocultação total em `dsh.quick-phrases.hidden.v1` e o estilo da entrada de gerenciamento em `dsh.quick-phrases.manage.v1`), com o isolamento de armazenamento web do DSH — trocar de máquina ou limpar os dados do site faz com que se percam. O menu «Exibição da linha de frases» não ocupa uma chave nova: ele lê e grava `hidden.v1` e `collapsed.v1`.

## Abrir diretamente pelo campo de entrada

O botão **Gerenciar** no fim da linha leva à mesma página de configurações (se a linha estiver recolhida na pílula, expanda-a primeiro). A entrada de gerenciamento pode ser trocada por um ícone de engrenagem ou oculta nas configurações; uma vez oculta, a linha não mostra mais o botão e **Configurações → Frases rápidas** é a forma de entrar. Se a entrada de configurações ainda não estiver montada na interface atual, a mensagem exibida é «请在『设置 — 快捷短语』中管理».

## Estilo

Botões, campos e cartões usam os tokens semânticos do host (`--dsw-alias-*`, `--dsw-radius-*`, `--dsw-focus-*`) e seguem os temas escuro e claro do DSH. A cor de primeiro plano do botão principal vem de `--dsw-alias-label-primary-foreground`, igual à variante primary do botão do host, garantindo contraste nos dois temas.

## Limites

- As frases são texto simples: variáveis não são interpretadas e comandos não são executados.
- Elas aparecem apenas junto ao campo de entrada da sessão; tarefas em segundo plano e tarefas agendadas não são afetadas.
- O idioma segue o da interface do DSH (chinês / inglês); as quatro frases padrão também são geradas localizadas conforme o idioma.

## Mais informações

- Detalhes de implementação (slots, camada de dados, estilos e testes): [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Contribuir: [CONTRIBUTING.md](../CONTRIBUTING.md)
- Relatórios de segurança: [SECURITY.md](../SECURITY.md)
