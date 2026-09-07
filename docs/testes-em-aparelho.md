# Roteiro de teste em aparelho — Treino Personalizado

Execute este roteiro em pelo menos um Android físico antes de enviar o APK a novos testadores.
Use uma instalação nova e, se possível, um aparelho que já tenha o app com dados para a etapa de backup.

## Instalação e primeira abertura

- Instale o APK e confirme o nome, ícone e tela de abertura.
- Na primeira abertura, toque em **Restaurar backup**, escolha um backup válido e confirme que o perfil, planos e histórico aparecem após a reinicialização.
- Repita com um arquivo que não seja backup e confirme que ele é recusado sem apagar os dados atuais.
- Abra o teclado em campos de Perfil, Planos e observação de exercício. O campo em foco deve continuar visível acima do teclado.

## Treino e navegação

- Navegue por Treino, Planos, Perfil e Metas; volte para cada aba e confira se a rolagem é preservada.
- Role lentamente perto do topo: o cabeçalho deve encolher uma vez, sem tremer.
- Altere uma repetição, carga e observação; feche e reabra o app. Os valores devem continuar salvos.
- Conclua um treino, verifique o relatório, o check-in, o histórico e o calendário.
- Inicie o cronômetro de descanso, deixe o app em segundo plano e volte; confirme que o tempo continua correto.

## Dados, arquivos e atualização

- Exporte o backup e guarde-o no Drive ou em Downloads. Importe-o de volta em uma instalação de teste.
- Atualize o APK por cima da mesma instalação. Android deve oferecer **Atualizar**, não uma segunda instalação, e os dados devem permanecer.
- Teste sem internet: abra o app, registre uma série e exporte um backup.

## Acessibilidade e visual

- Navegue com teclado físico ou leitor de tela, quando disponível. O controle em foco deve ter contorno azul e os botões de fechar devem ter nome compreensível.
- Confira em telas pequenas e grandes; o app opera apenas em retrato por projeto.
- Registre para cada falha: modelo do aparelho, versão do Android, passo a passo, captura de tela e, se possível, o backup anonimizado.

## Critério para distribuição

Não distribua a versão se houver perda de dados, impossibilidade de importar/exportar backup, travamento, erro ao atualizar por cima do APK anterior ou bloqueio do teclado sobre o campo em uso.
