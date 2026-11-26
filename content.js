/* ============================================================
   CONTEÚDO DO SITE — é aqui que você adiciona obras e capítulos.

   Cada OBRA tem capítulos. Cada CAPÍTULO tem:
     - cover: a imagem de capa do capítulo (aparece primeiro na leitura)
     - pages: as páginas, em ordem

   seq('pasta/', quantidade, 'jpg')  gera  pasta/1.jpg, pasta/2.jpg ...
   ============================================================ */

function seq(folder, count, ext) {
  var out = [];
  for (var i = 1; i <= count; i++) out.push(folder + i + '.' + (ext || 'jpg'));
  return out;
}

window.LIBRARY = [
  {
    id: 'mark',
    title: 'Mark - Spin OFF (O INICIO e o FIM)',
    author: 'MARK',
    type: 'Mangá · Spin-off',
    description: '',
    cover: 'images/mark/capa-obra.jpg',
    chapters: [
      {
        id: '1',
        number: 1,
        title: 'O Início nas Quadras',
        cover: 'images/mark/cap1/capa.jpg',
        pages: seq('images/mark/cap1/', 7, 'jpg?v=5')
      }
    ]
  }
];
