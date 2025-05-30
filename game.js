// Elementos do DOM
const game = document.getElementById('game');
const character = document.getElementById('character');
const scoreDisplay = document.getElementById('score');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');
const jumpBtn = document.getElementById('jump');
const shootBtn = document.getElementById('shoot');

// Criar o chão invisível (apenas para colisão)
const ground = document.createElement('div');
ground.className = 'ground';
game.appendChild(ground);

// Configurações do jogo
const viewportWidth = window.innerWidth; // Usa a largura da janela do navegador
const gameWidth = viewportWidth * 3; // O jogo terá 3x a largura da tela
const gameHeight = window.innerHeight; // Usa a altura da janela do navegador
const characterWidth = 50; // Ajustado para o tamanho real da imagem
const characterHeight = 100; // Ajustado para o tamanho real da imagem
const gravity = 0.5;
const jumpForce = 15;
const moveSpeed = 5;
const projectileSpeed = 10;
const shootCooldown = 500; // tempo mínimo entre tiros em ms
const enemyKillScore = 20;
const spikeKillScore = 10; // Pontuação extra por destruir espinhos
const bossKillScore = 250; // Pontuação aumentada por derrotar o boss
const groundLevel = 240; // Aumentado para baixar o chão visual da imagem
const vanishingPlatformColor = '#c9a15d'; // Cor das plataformas que desaparecem

// Estado do jogo
let score = 0;
let characterX = 50;
let characterY = gameHeight - characterHeight - groundLevel; // Ajustado para o chão visual
let velocityY = 0;
let isJumping = false;
let isMovingLeft = false;
let isMovingRight = false;
let isFacingLeft = false; // direção do personagem
let gameOver = false;
let lastShootTime = 0;
let cameraPosX = 0; // Posição da câmera para rolagem
let platforms = [];
let coins = [];
let enemies = [];
let spikes = [];
let holes = [];
let projectiles = [];
let fireballs = []; // Nova array para as bolas de fogo do boss
let explosions = [];
let powerUps = []; // Nova array para os power-ups
let gameLoop;
let difficultyTimer;
let difficultyLevel = 1;
let playerLives = 3; // Número de vidas do jogador
let hasShield = false; // Se o jogador tem escudo ativo
let shieldTimer = 0; // Tempo restante do escudo
let speedBoostTimer = 0; // Tempo restante do boost de velocidade
let strengthBoostTimer = 0; // Tempo restante do boost de força

// Variáveis para sistema de combo
let comboCount = 0;
let comboMultiplier = 1;
let comboTimer = 0;
let comboTimeout = null;
let comboDisplay = null; // Elemento para exibir o combo

// Funções para controlar o personagem
function moveLeft() {
    if (characterX > 0) {
        characterX -= moveSpeed;
        character.style.left = characterX + 'px';
        if (!isFacingLeft) {
            isFacingLeft = true;
            character.classList.add('facing-left');
        }
    }
}

function moveRight() {
    if (characterX < gameWidth - characterWidth) {
        characterX += moveSpeed;
        character.style.left = characterX + 'px';
        if (isFacingLeft) {
            isFacingLeft = false;
            character.classList.remove('facing-left');
        }
    }
}

function jump() {
    if (!isJumping) {
        velocityY = -jumpForce;
        isJumping = true;
    }
}

// Detecção de colisão
function isColliding(a, b) {
    return !(
        a.x + a.width < b.x ||
        a.x > b.x + b.width ||
        a.y + a.height < b.y ||
        a.y > b.y + b.height
    );
}

// Criar plataformas
function createPlatform(x, y, width, isVanishing = false) {
    const platform = document.createElement('div');
    platform.className = isVanishing ? 'platform platform-vanishing' : 'platform';
    platform.style.left = x + 'px';
    platform.style.top = y + 'px';
    platform.style.width = width + 'px';
    game.appendChild(platform);
    
    platforms.push({
        element: platform,
        x: x,
        y: y,
        width: width,
        height: 20,
        isVanishing: isVanishing,
        vanishTimer: 0,
        isVanished: false
    });
}

// Criar plataforma que desaparece
function createVanishingPlatform(x, y, width) {
    createPlatform(x, y, width, true);
}

// Criar moedas
function createCoin(x, y) {
    const coin = document.createElement('div');
    coin.className = 'coin';
    coin.style.left = x + 'px';
    coin.style.top = y + 'px';
    game.appendChild(coin);
    
    coins.push({
        element: coin,
        x: x,
        y: y,
        width: 20,
        height: 20,
        collected: false
    });
}

// Atualizar a posição da câmera
function updateCamera() {
    // A câmera segue o personagem com um pequeno atraso
    const targetX = Math.max(0, Math.min(characterX - viewportWidth / 2, gameWidth - viewportWidth));
    cameraPosX += (targetX - cameraPosX) * 0.1;
    
    // Aplicar a posição da câmera
    game.style.transform = `translateX(-${cameraPosX}px)`;
}

// Criar espinhos
function createSpikes(x, count) {
    const spikeGroup = document.createElement('div');
    spikeGroup.className = 'spike-group';
    spikeGroup.style.left = x + 'px';
    spikeGroup.style.width = (count * 20) + 'px'; // Corrigido para corresponder à largura dos espinhos
    game.appendChild(spikeGroup);
    
    // Criar os espinhos individuais
    for (let i = 0; i < count; i++) {
        const spike = document.createElement('div');
        spike.className = 'spike';
        spike.style.left = (i * 20) + 'px'; // Posicionar cada espinho horizontalmente
        spikeGroup.appendChild(spike);
    }
    
    spikes.push({
        element: spikeGroup,
        x: x,
        y: gameHeight - groundLevel - 10, // altura do novo chão - altura dos espinhos (20)
        width: count * 20,
        height: 20,
        destructible: true
    });
}

// Criar buracos no chão
function createHole(x, width) {
    const hole = document.createElement('div');
    hole.className = 'hole';
    hole.style.left = x + 'px';
    hole.style.width = width + 'px';
    game.appendChild(hole);
    
    holes.push({
        element: hole,
        x: x,
        y: gameHeight - groundLevel, // Usa o groundLevel atual
        width: width,
        height: groundLevel // Altura do buraco igual ao groundLevel
    });
}

// Criar inimigos normais
function createEnemy(x, platformY) {
    const enemy = document.createElement('div');
    enemy.className = 'enemy';
    enemy.style.left = x + 'px';
    game.appendChild(enemy);
    
    // Se platformY for fornecido, coloca o inimigo na plataforma, caso contrário no chão
    const yPos = platformY ? platformY - 40 : gameHeight - groundLevel - 50; // Ajustado para o novo nível de chão
    
    enemies.push({
        element: enemy,
        x: x,
        y: yPos,
        width: 40,
        height: 40,
        type: 'normal',
        direction: -1, // -1 para esquerda, 1 para direita
        health: 1,     // quantidade de tiros para matar
        onPlatform: !!platformY,
        platformY: platformY
    });
}

// Criar inimigos voadores
function createFlyingEnemy(x, y) {
    const enemy = document.createElement('div');
    enemy.className = 'enemy-flying';
    enemy.style.left = x + 'px';
    enemy.style.top = y + 'px';
    game.appendChild(enemy);
    
    enemies.push({
        element: enemy,
        x: x,
        y: y,
        width: 50,
        height: 40,
        type: 'flying',
        direction: Math.random() < 0.5 ? -1 : 1, // direção aleatória
        verticalDirection: Math.random() < 0.5 ? -1 : 1, // direção vertical aleatória
        health: 2,  // mais difícil de matar
        moveSpeed: 3,
        verticalRange: 60, // amplitude do movimento vertical
        initialY: y // guardar a posição inicial para o movimento oscilatório
    });
}

// Criar inimigos saltadores
function createJumpingEnemy(x) {
    const enemy = document.createElement('div');
    enemy.className = 'enemy-jumping';
    enemy.style.left = x + 'px';
    game.appendChild(enemy);
    
    enemies.push({
        element: enemy,
        x: x,
        y: gameHeight - 40 - 60, // Ajustado para a altura maior
        width: 40,
        height: 60,
        type: 'jumping',
        direction: Math.random() < 0.5 ? -1 : 1,
        health: 2,
        jumpCooldown: 0,
        jumping: false,
        jumpVelocity: 0
    });
}

// Criar projétil
function createProjectile() {
    if (gameOver) return;
    
    const currentTime = Date.now();
    if (currentTime - lastShootTime < shootCooldown) return;
    
    lastShootTime = currentTime;
    
    const projectile = document.createElement('div');
    projectile.className = 'projectile';
    
    // Determinar posição inicial do projétil com base na orientação do personagem
    const direction = isFacingLeft ? -1 : 1;
    const startX = isFacingLeft ? characterX - 15 : characterX + characterWidth;
    const startY = characterY + characterHeight / 2 - 4; // Centralizar verticalmente
    
    projectile.style.left = startX + 'px';
    projectile.style.top = startY + 'px';
    game.appendChild(projectile);
    
    projectiles.push({
        element: projectile,
        x: startX,
        y: startY,
        width: 15,
        height: 8,
        direction: direction
    });
}

// Criar explosão
function createExplosion(x, y) {
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    explosion.style.left = (x - 25) + 'px'; // Centralizar
    explosion.style.top = (y - 25) + 'px'; // Centralizar
    game.appendChild(explosion);
    
    explosions.push({
        element: explosion,
        lifetime: 20 // Quantidade de frames que a explosão permanece ativa
    });
}

// Criar bola de fogo do boss (usando apenas CSS)
function createBossFireball(x, y, direction) {
    // Criar elemento da bola de fogo
    const fireball = document.createElement('div');
    fireball.className = 'boss-fireball';
    
    // Criar elementos internos para o efeito de fogo
    const fireCore = document.createElement('div');
    fireCore.className = 'fire-core';
    fireball.appendChild(fireCore);
    
    const fireGlow = document.createElement('div');
    fireGlow.className = 'fire-glow';
    fireball.appendChild(fireGlow);
    
    // Partículas de fogo
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.className = 'fire-particle';
        particle.style.animationDelay = (i * 0.1) + 's';
        fireball.appendChild(particle);
    }
    
    // Posicionar a bola de fogo
    fireball.style.left = x + 'px';
    fireball.style.top = y + 'px';
    game.appendChild(fireball);
    
    // Adicionar a bola de fogo à lista
    fireballs.push({
        element: fireball,
        x: x,
        y: y,
        width: 40,
        height: 40,
        direction: direction,
        speed: 8,
        damage: 1
    });
}

// Aplicar efeito do power-up coletado
function applyPowerUp(type) {
    // Criar mensagem de power-up
    const message = document.createElement('div');
    message.className = 'message';
    message.style.position = 'absolute';
    message.style.left = characterX + 'px';
    message.style.top = (characterY - 40) + 'px';
    message.style.color = 'white';
    message.style.zIndex = '100';
    message.style.textShadow = '0 0 5px #000';
    message.style.fontSize = '18px';
    
    // Aplicar efeito baseado no tipo
    switch (type) {
        case 'shield':
            // Escudo que protege contra um hit
            hasShield = true;
            shieldTimer = 15000; // 15 segundos
            message.textContent = 'Escudo Ativado!';
            message.style.textShadow = '0 0 5px blue';
            
            // Adicionar efeito visual de escudo
            const shieldEffect = document.createElement('div');
            shieldEffect.className = 'shield-effect';
            shieldEffect.style.left = (characterX - 10) + 'px';
            shieldEffect.style.top = (characterY - 10) + 'px';
            game.appendChild(shieldEffect);
            
            // Atualizar posição do escudo com o personagem
            const shieldInterval = setInterval(() => {
                if (!gameOver && hasShield && shieldEffect.parentNode) {
                    shieldEffect.style.left = (characterX - 10) + 'px';
                    shieldEffect.style.top = (characterY - 10) + 'px';
                } else {
                    clearInterval(shieldInterval);
                    if (shieldEffect.parentNode) {
                        game.removeChild(shieldEffect);
                    }
                }
            }, 50);
            
            // Remover o escudo após o tempo
            setTimeout(() => {
                if (!gameOver && hasShield) {
                    hasShield = false;
                    if (shieldEffect.parentNode) {
                        game.removeChild(shieldEffect);
                    }
                    // Mensagem de expiração
                    const expireMessage = document.createElement('div');
                    expireMessage.className = 'message';
                    expireMessage.textContent = 'Escudo Expirou';
                    expireMessage.style.position = 'absolute';
                    expireMessage.style.left = characterX + 'px';
                    expireMessage.style.top = (characterY - 30) + 'px';
                    expireMessage.style.color = 'white';
                    expireMessage.style.textShadow = '0 0 5px blue';
                    expireMessage.style.zIndex = '100';
                    game.appendChild(expireMessage);
                    setTimeout(() => {
                        if (expireMessage.parentNode) {
                            game.removeChild(expireMessage);
                        }
                    }, 1500);
                }
            }, shieldTimer);
            break;
            
        case 'speed':
            // Aumentar velocidade de movimento
            moveSpeed *= 1.5;
            speedBoostTimer = 10000; // 10 segundos
            message.textContent = 'Velocidade Aumentada!';
            message.style.textShadow = '0 0 5px yellow';
            
            // Efeito visual de velocidade
            character.style.filter = 'drop-shadow(0 0 5px yellow)';
            
            // Restaurar velocidade após o tempo
            setTimeout(() => {
                if (!gameOver) {
                    moveSpeed /= 1.5;
                    character.style.filter = 'none';
                    
                    // Mensagem de expiração
                    const expireMessage = document.createElement('div');
                    expireMessage.className = 'message';
                    expireMessage.textContent = 'Velocidade Normal';
                    expireMessage.style.position = 'absolute';
                    expireMessage.style.left = characterX + 'px';
                    expireMessage.style.top = (characterY - 30) + 'px';
                    expireMessage.style.color = 'white';
                    expireMessage.style.textShadow = '0 0 5px yellow';
                    expireMessage.style.zIndex = '100';
                    game.appendChild(expireMessage);
                    setTimeout(() => {
                        if (expireMessage.parentNode) {
                            game.removeChild(expireMessage);
                        }
                    }, 1500);
                }
            }, speedBoostTimer);
            break;
            
        case 'strength':
            // Aumentar poder de ataque
            strengthBoostTimer = 10000; // 10 segundos
            message.textContent = 'Poder de Ataque Aumentado!';
            message.style.textShadow = '0 0 5px red';
            
            // Efeito visual de força
            character.style.filter = 'drop-shadow(0 0 5px red)';
            
            // Ativar dano duplo para os projéteis
            const oldDamage = 1; // Dano padrão dos projéteis
            // Lógica para aumentar o dano será implementada na colisão de projéteis
            
            // Restaurar força após o tempo
            setTimeout(() => {
                if (!gameOver) {
                    character.style.filter = 'none';
                    strengthBoostTimer = 0;
                    
                    // Mensagem de expiração
                    const expireMessage = document.createElement('div');
                    expireMessage.className = 'message';
                    expireMessage.textContent = 'Força Normal';
                    expireMessage.style.position = 'absolute';
                    expireMessage.style.left = characterX + 'px';
                    expireMessage.style.top = (characterY - 30) + 'px';
                    expireMessage.style.color = 'white';
                    expireMessage.style.textShadow = '0 0 5px red';
                    expireMessage.style.zIndex = '100';
                    game.appendChild(expireMessage);
                    setTimeout(() => {
                        if (expireMessage.parentNode) {
                            game.removeChild(expireMessage);
                        }
                    }, 1500);
                }
            }, strengthBoostTimer);
            break;
    }
    
    // Adicionar mensagem ao jogo
    game.appendChild(message);
    
    // Remover a mensagem após alguns segundos
    setTimeout(() => {
        if (message.parentNode) {
            game.removeChild(message);
        }
    }, 2000);
}

// Criar efeito de morte do boss
function createBossDeathEffect(x, y) {
    // Criar múltiplas explosões em posições aleatórias próximas
    for (let i = 0; i < 5; i++) {
        const offsetX = Math.random() * 100 - 50;
        const offsetY = Math.random() * 100 - 50;
        createExplosion(x + offsetX, y + offsetY);
    }
    
    // Criar o efeito principal de morte do boss
    const deathEffect = document.createElement('div');
    deathEffect.className = 'boss-death';
    deathEffect.style.left = (x - 75) + 'px'; // Centralizar
    deathEffect.style.top = (y - 75) + 'px'; // Centralizar
    game.appendChild(deathEffect);
    
    // Remover o efeito após a animação terminar
    setTimeout(() => {
        if (deathEffect.parentNode) {
            game.removeChild(deathEffect);
        }
    }, 1500); // 1.5 segundos, igual à duração da animação
    
    // Adicionar moedas extras como recompensa
    for (let i = 0; i < 5; i++) {
        const offsetX = Math.random() * 120 - 60;
        const offsetY = Math.random() * 120 - 100;
        createCoin(x + offsetX, y + offsetY);
    }
}

// Aumentar dificuldade com o tempo com base na posição do personagem
function increaseDifficulty() {
    // Limitar o número total de inimigos
    if (enemies.length > 10) return;
    
    // A dificuldade agora depende de onde o jogador está
    // Quanto mais perto do Boss, mais difícil
    let difficultyFactor;
    
    // Dividimos o jogo em 3 áreas
    if (characterX < 800) {
        // Área inicial - chance muito baixa de spawn de inimigos simples
        difficultyFactor = 0.1; // Reduzido de 0.3 para 0.1
        if (Math.random() > difficultyFactor) return;
        
        // Apenas inimigos normais no início
        createEnemy(Math.random() * 800);
        
    } else if (characterX < 1600) {
        // Área intermediária - chance média e mais tipos
        difficultyFactor = 0.2; // Reduzido de 0.5 para 0.2
        if (Math.random() > difficultyFactor) return;
        
        // Maior variedade de inimigos
        const enemyType = Math.random();
        if (enemyType < 0.7) {
            createEnemy(characterX + viewportWidth/2 + Math.random() * 300);
        } else {
            createFlyingEnemy(characterX + viewportWidth/2 + Math.random() * 300, 150);
        }
        
    } else {
        // Área final - chance alta, todos os tipos de inimigos
        difficultyFactor = 0.3; // Reduzido de 0.7 para 0.3
        if (Math.random() > difficultyFactor) return;
        
        // Todos os tipos de inimigos, com maior frequência
        const enemyType = Math.random();
        if (enemyType < 0.4) {
            createEnemy(characterX + viewportWidth/2 + Math.random() * 300);
        } else if (enemyType < 0.7) {
            createFlyingEnemy(characterX + viewportWidth/2 + Math.random() * 300, 100 + Math.random() * 100);
        } else {
            createJumpingEnemy(characterX + viewportWidth/2 + Math.random() * 300);
        }
    }
}

// Configurar o nível
function setupLevel() {
    // Criar o chão - já existe um chão padrão, mas podemos ajustá-lo para se estender pelo nível todo
    ground.style.width = gameWidth + 'px';
    
    // Primeira seção: Área inicial (0-800px) - Poucos inimigos para começar
    // Plataformas na primeira seção - alturas ajustadas para serem alcançáveis
    createPlatform(200, 500, 100); // Ajustado de 300 para 500
    createPlatform(350, 450, 100); // Ajustado de 250 para 450
    createPlatform(500, 400, 100); // Ajustado de 200 para 400
    createPlatform(650, 350, 100); // Ajustado de 150 para 350
    
    // Adicionar uma plataforma que desaparece na área inicial para tutorial
    createVanishingPlatform(420, 350, 60);
    // Moeda especial acima da plataforma que desaparece para incentivar o uso
    createCoin(440, 320);
    
    // Moedas na primeira seção
    createCoin(230, 470); // Ajustado para 30px acima da plataforma (plataforma em y=500)
    createCoin(380, 420); // Ajustado para 30px acima da plataforma (plataforma em y=450)
    createCoin(530, 370); // Ajustado para 30px acima da plataforma (plataforma em y=400)
    createCoin(680, 320); // Ajustado para 30px acima da plataforma (plataforma em y=350)
    
    // Inimigos na primeira seção - Apenas 1 inimigo básico para começar
    createEnemy(500); // no chão - apenas um inimigo no início
    
    // Segunda seção: Área intermediária (800-1600px) - Dificuldade moderada
    // Plataformas na segunda seção - alturas ajustadas para serem alcançáveis
    createPlatform(850, 500, 120); // Ajustado de 300 para 500
    createPlatform(1050, 450, 100); // Ajustado de 250 para 450
    createPlatform(1200, 400, 120); // Ajustado de 200 para 400
    createPlatform(1400, 350, 100); // Ajustado de 150 para 350
    createPlatform(1550, 450, 80); // Ajustado de 250 para 450
    
    // Plataformas que desaparecem criando caminhos alternativos
    createVanishingPlatform(920, 430, 80); // Caminho alternativo entre plataformas
    createVanishingPlatform(1100, 350, 60); // Atalho vertical para pular seção com espinhos
    
    // Moedas extras nas plataformas que desaparecem
    createCoin(940, 400); // Moeda acima da primeira plataforma que desaparece
    createCoin(1120, 320); // Moeda acima da segunda plataforma que desaparece
    
    // Power-up de escudo em local estratégico antes dos espinhos
    createPowerUp(1080, 280, 'shield');
    
    // Buracos na segunda seção
    createHole(950, 80);
    createHole(1300, 100);
    
    // Espinhos na segunda seção
    createSpikes(1120, 5); // Aumentando para 5 espinhos juntos
    
    // Moedas na segunda seção (algumas em lugares difíceis)
    createCoin(900, 470); // Ajustado para 30px acima da plataforma (plataforma em y=500)
    createCoin(1080, 420); // Ajustado para 30px acima da plataforma (plataforma em y=450)
    createCoin(1230, 370); // Ajustado para 30px acima da plataforma (plataforma em y=400)
    createCoin(1430, 320); // Ajustado para 30px acima da plataforma (plataforma em y=350)
    createCoin(990, 350); // acima do buraco, desafio para pegar (ajustado para ser alcançável)
    createCoin(1350, 300); // acima do buraco, desafio para pegar (ajustado para ser alcançável)
    
    // Inimigos na segunda seção - Aumentando gradualmente a dificuldade
    createEnemy(880, 500); // na plataforma (ajustado para nova altura da plataforma)
    createEnemy(1000); // no chão
    createFlyingEnemy(1250, 400); // inimigo voador ajustado para ficar na área das plataformas
    
    // Área intermediária-avançada (1600-2000px) - Dificuldade aumentando
    // Plataformas nesta área
    createPlatform(1650, 300, 80);
    createPlatform(1750, 250, 80);
    createPlatform(1850, 200, 80);
    createPlatform(1950, 150, 80);
    
    // Plataformas que desaparecem em sequência para criar um desafio de tempo
    createVanishingPlatform(1700, 350, 70);
    createVanishingPlatform(1800, 300, 70);
    createVanishingPlatform(1900, 250, 70);
    
    // Moedas extras acima das plataformas que desaparecem
    createCoin(1730, 320); // Moeda acima da primeira plataforma
    createCoin(1830, 270); // Moeda acima da segunda plataforma
    createCoin(1930, 220); // Moeda acima da terceira plataforma
    
    // Power-up de velocidade para ajudar a completar o desafio de tempo
    createPowerUp(1750, 230, 'speed');
    
    // Buracos nesta área
    createHole(1700, 50);
    
    // Espinhos nesta área
    createSpikes(1800, 2);
    
    // Moedas nesta área
    createCoin(1680, 270);
    createCoin(1780, 220);
    createCoin(1880, 170);
    createCoin(1980, 120);
    
    // Inimigos nesta área - Reduzidos
    createJumpingEnemy(1750); // Introduzindo inimigo saltador
    createFlyingEnemy(1850, 120);
    
    // Área final antes do Boss (2000-2350px) - Dificuldade intensa
    // Plataformas na área final
    createPlatform(2050, 150, 80);
    createPlatform(2150, 200, 80);
    createPlatform(2250, 250, 80);
    
    // Plataformas que desaparecem para criar um caminho desafiador até o boss
    createVanishingPlatform(2000, 350, 60);
    createVanishingPlatform(2100, 300, 60);
    createVanishingPlatform(2200, 350, 60);
    
    // Moedas no caminho desafiador
    createCoin(2020, 320); // Moeda acima da primeira plataforma
    createCoin(2120, 270); // Moeda acima da segunda plataforma
    createCoin(2220, 320); // Moeda acima da terceira plataforma
    
    // Caminho alternativo com plataformas que desaparecem (mais desafiador, mas com recompensa)
    createVanishingPlatform(2120, 100, 50);
    createVanishingPlatform(2200, 120, 50);
    createVanishingPlatform(2300, 150, 50);
    
    // Moedas de maior valor no caminho alternativo mais difícil
    createCoin(2135, 70); // Moeda acima da primeira plataforma
    createCoin(2215, 90); // Moeda acima da segunda plataforma
    createCoin(2315, 120); // Moeda acima da terceira plataforma
    
    // Power-up de força no final do caminho alternativo para ajudar contra o boss
    createPowerUp(2330, 80, 'strength');
    
    // Buracos na área final
    createHole(1900, 60);
    createHole(2100, 70);
    
    // Espinhos na área final - Mais espinhos
    createSpikes(2000, 3);
    createSpikes(2200, 4);
    
    // Moedas na área final
    createCoin(2080, 320); // Ajustado para 30px acima da plataforma (plataforma em y=350)
    createCoin(2180, 370); // Ajustado para 30px acima da plataforma (plataforma em y=400)
    createCoin(2280, 420); // Ajustado para 30px acima da plataforma (plataforma em y=450)
    
    // Inimigos na área final - Reduzidos para menor dificuldade
    createJumpingEnemy(2050);
    createFlyingEnemy(2150, 400); // Ajustado para área das plataformas
    createEnemy(2180, 400); // inimigo na plataforma (ajustado para nova altura da plataforma)
    createFlyingEnemy(2250, 420); // Ajustado para área das plataformas
    
    // Moeda especial de maior valor ao final do nível
    const finalCoin = createCoin(2350, 220);
    
    // Boss na área final
    createBoss(2350, 120);
}

// Atualizar o jogo
function update() {
    if (gameOver) return;
    
    // Mover personagem
    if (isMovingLeft) moveLeft();
    if (isMovingRight) moveRight();
    
    // Aplicar gravidade
    velocityY += gravity;
    characterY += velocityY;
    
    // Verificar colisão com o chão (onde não há buracos)
    let isOverHole = false;
    
    // Verificar se o personagem está sobre um buraco
    for (const hole of holes) {
        if (
            characterX + characterWidth > hole.x &&
            characterX < hole.x + hole.width &&
            characterY + characterHeight >= gameHeight - groundLevel
        ) {
            isOverHole = true;
            
            // Se o personagem cair no buraco, ele cai para fora da tela
            if (characterY + characterHeight > gameHeight) {
                gameOver = true;
                endGame("Você caiu em um buraco!");
            }
            
            break;
        }
    }
    
    // Se não estiver sobre um buraco, aplica colisão com o chão
    if (!isOverHole && characterY >= gameHeight - characterHeight - groundLevel) {
        characterY = gameHeight - characterHeight - groundLevel;
        velocityY = 0;
        isJumping = false;
    }
    
    // Verificar colisão com plataformas
    let onPlatform = false;
    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        
        // Verificar se a plataforma está desaparecendo
        if (platform.isVanished) continue;
        
        // Verificar colisão com plataforma
        if (
            velocityY >= 0 &&
            characterX + characterWidth > platform.x &&
            characterX < platform.x + platform.width &&
            characterY + characterHeight >= platform.y &&
            characterY + characterHeight <= platform.y + 10
        ) {
            characterY = platform.y - characterHeight;
            velocityY = 0;
            isJumping = false;
            onPlatform = true;
            
            // Se for uma plataforma que desaparece, iniciar o processo de desaparecimento
            if (platform.isVanishing && !platform.isVanished && platform.vanishTimer === 0) {
                platform.vanishTimer = 60; // Tempo até desaparecer (aproximadamente 1 segundo)
                platform.element.classList.add('vanishing-active');
            }
        }
        
        // Atualizar timer de plataformas que desaparecem
        if (platform.isVanishing && platform.vanishTimer > 0) {
            platform.vanishTimer--;
            
            // Se o timer chegou a zero, fazer a plataforma desaparecer
            if (platform.vanishTimer === 0) {
                platform.isVanished = true;
                platform.element.classList.add('vanished');
                
                // Adicionar efeito de partículas quando a plataforma desaparece
                const particles = document.createElement('div');
                particles.className = 'platform-particles';
                particles.style.left = platform.x + 'px';
                particles.style.top = platform.y + 'px';
                particles.style.width = platform.width + 'px';
                game.appendChild(particles);
                
                // Remover partículas após a animação
                setTimeout(() => {
                    if (particles.parentNode) {
                        game.removeChild(particles);
                    }
                }, 1000);
            }
        }
    }
    
    // Verificar se caiu em um buraco (morreu)
    if (characterY > gameHeight) {
        if (loseLife('Game Over! Você caiu em um buraco! Pontuação: ' + score)) {
            return; // Se retornou true, é game over definitivo
        } else {
            // Colocar o personagem de volta a uma posição segura
            characterY = gameHeight - characterHeight - groundLevel;
            velocityY = 0;
            // Um pequeno impulso para trás para evitar cair novamente
            characterX -= 100;
            if (characterX < 0) characterX = 50; // Evitar sair da tela
            character.style.left = characterX + 'px';
            character.style.top = characterY + 'px';
        }
    }
    
    // Atualizar posição do personagem
    character.style.left = characterX + 'px';
    character.style.top = characterY + 'px';
    
    // Atualizar a câmera
    updateCamera();
    
    // Verificar colisão com moedas
    coins.forEach((coin, index) => {
        if (!coin.collected && isColliding(
            {x: characterX, y: characterY, width: characterWidth, height: characterHeight},
            coin
        )) {
            coin.collected = true;
            coin.element.style.display = 'none';
            score += 10;
            scoreDisplay.textContent = 'Pontuação: ' + score;
        }
    });
    
    // Verificar colisão com espinhos
    for (const spike of spikes) {
        if (isColliding(
            {x: characterX, y: characterY, width: characterWidth, height: characterHeight},
            spike
        )) {
            if (loseLife('Game Over! Você foi espetado! Pontuação: ' + score)) {
                return; // Se retornou true, é game over definitivo
            } else {
                // Pequeno recuo para evitar colisão contínua
                characterX = spike.x > characterX ? characterX - 30 : characterX + 30;
                character.style.left = characterX + 'px';
                break; // Sair do loop após processar uma colisão
            }
        }
    };
    
    // Verificar colisão com power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        if (!powerUp.collected && isColliding(
            {x: characterX, y: characterY, width: characterWidth, height: characterHeight},
            powerUp
        )) {
            // Coletar power-up
            powerUp.collected = true;
            powerUp.element.style.display = 'none';
            
            // Aplicar efeito do power-up
            applyPowerUp(powerUp.type);
            
            // Remover da lista de power-ups
            game.removeChild(powerUp.element);
            powerUps.splice(i, 1);
        }
    }
    
    // Atualizar inimigos
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.health <= 0) continue; // Pula inimigos já mortos
        
        // Comportamento específico para cada tipo de inimigo
        switch (enemy.type) {
            case 'normal':
                // Inimigo normal que anda pela plataforma ou chão
                enemy.x += enemy.direction * 2;
                
                // Mudar direção quando atingir as bordas
                if (enemy.x <= 0 || enemy.x >= gameWidth - enemy.width) {
                    enemy.direction *= -1;
                }
                
                // Se estiver em uma plataforma, verifica os limites da plataforma
                if (enemy.onPlatform) {
                    // Encontra a plataforma onde o inimigo está
                    const platform = platforms.find(p => p.y === enemy.platformY);
                    if (platform) {
                        if (enemy.x <= platform.x - 10 || enemy.x >= platform.x + platform.width - 30) {
                            enemy.direction *= -1;
                        }
                    }
                }
                break;
                
            case 'flying':
                // Inimigo voador que se move em padrões mais complexos
                enemy.x += enemy.direction * enemy.moveSpeed;
                
                // Movimento vertical oscilatório
                enemy.y = enemy.initialY + Math.sin(Date.now() / 500) * enemy.verticalRange;
                
                // Mudar direção quando atingir as bordas
                if (enemy.x <= 0 || enemy.x >= gameWidth - enemy.width) {
                    enemy.direction *= -1;
                }
                break;
                
            case 'jumping':
                // Inimigo saltador que pula ocasionalmente
                if (enemy.jumpCooldown > 0) {
                    enemy.jumpCooldown--;
                } else if (!enemy.jumping) {
                    // Iniciar um salto
                    enemy.jumping = true;
                    enemy.jumpVelocity = -12; // Força do salto
                }
                
                if (enemy.jumping) {
                    // Aplicar gravidade
                    enemy.jumpVelocity += 0.4;
                    enemy.y += enemy.jumpVelocity;
                    
                    // Verificar se aterrissou
                    if (enemy.y >= gameHeight - groundLevel - 60) { // Novo nível do chão - altura do inimigo
                        enemy.y = gameHeight - groundLevel - 60;
                        enemy.jumping = false;
                        enemy.jumpCooldown = 60; // Esperar um pouco até o próximo salto
                    }
                }
                
                // Movimento horizontal
                enemy.x += enemy.direction * 1.5;
                
                // Mudar direção aleatoriamente ou quando atingir as bordas
                if (enemy.x <= 0 || enemy.x >= gameWidth - enemy.width || Math.random() < 0.01) {
                    enemy.direction *= -1;
                }
                break;
                
            case 'boss':
                // Comportamento do boss
                // Movimento horizontal mais agressivo
                enemy.x += enemy.direction * enemy.moveSpeed * 0.7;
                
                // Movimento vertical oscilatório mais amplo
                enemy.y = enemy.initialY + Math.sin(Date.now() / 500) * enemy.verticalRange;
                
                // Mudar direção ao atingir bordas
                if (enemy.x <= gameWidth - 400 || enemy.x >= gameWidth - enemy.width) {
                    enemy.direction *= -1;
                }
                
                // Reduzir cooldown de ataque regular
                if (enemy.attackCooldown > 0) {
                    enemy.attackCooldown--;
                }
                
                // Reduzir cooldown de ataque de fogo
                if (enemy.fireballCooldown > 0) {
                    enemy.fireballCooldown--;
                }
                
                // Ataque periódico 1: criação de inimigos voadores
                if (enemy.attackCooldown === 0 && Math.random() < 0.03) { // Probabilidade aumentada
                    enemy.attackCooldown = 100; // Tempo reduzido entre ataques
                    
                    // Tente criar um inimigo voador próximo ao boss
                    if (enemies.length < 25) { // Limite aumentado de inimigos
                        createFlyingEnemy(enemy.x, enemy.y + 40);
                    }
                }
                
                // Ataque periódico 2: lançamento de bolas de fogo
                if (enemy.fireballCooldown === 0 && Math.random() < 0.05) { // Alta probabilidade
                    // Primeiro mostrar uma advertência
                    if (!enemy.isWarning) {
                        // Criar efeito de advertência
                        const warning = document.createElement('div');
                        warning.className = 'boss-warning';
                        warning.style.left = (enemy.x + enemy.width/2 - 60) + 'px';
                        warning.style.top = (enemy.y + enemy.height/2 - 60) + 'px';
                        game.appendChild(warning);
                        
                        // Guardar referência ao elemento de advertência
                        enemy.warningElement = warning;
                        enemy.isWarning = true;
                        enemy.warningTimer = 30; // Meio segundo de advertência
                        
                        // Som de advertência (opcional)
                        // playSound('warning');
                    } else {
                        // Diminuir timer de advertência
                        enemy.warningTimer--;
                        
                        // Atualizar posição da advertência
                        if (enemy.warningElement) {
                            enemy.warningElement.style.left = (enemy.x + enemy.width/2 - 60) + 'px';
                            enemy.warningElement.style.top = (enemy.y + enemy.height/2 - 60) + 'px';
                        }
                        
                        // Quando o timer acabar, lançar a bola de fogo
                        if (enemy.warningTimer <= 0) {
                            enemy.fireballCooldown = 80; // Intervalo entre ataques
                            enemy.isWarning = false;
                            
                            // Remover a advertência
                            if (enemy.warningElement) {
                                game.removeChild(enemy.warningElement);
                                enemy.warningElement = null;
                            }
                            
                            // Lançar bola de fogo na direção do personagem
                            const fireballX = enemy.x + (enemy.direction < 0 ? 0 : enemy.width);
                            const fireballY = enemy.y + enemy.height/2;
                            
                            // Determinar direção da bola de fogo (em direção ao personagem)
                            const fireballDirection = (characterX < enemy.x) ? -1 : 1;
                            
                            // Criar bola de fogo grande
                            createBossFireball(fireballX, fireballY, fireballDirection);
                        }
                    }
                }
                break;
        }
        
        // Atualizar posição na tela
        enemy.element.style.left = enemy.x + 'px';
        enemy.element.style.top = enemy.y + 'px';
        
        // Verificar colisão com inimigos
        if (isColliding(
            {x: characterX, y: characterY, width: characterWidth, height: characterHeight},
            enemy
        )) {
            // Verificar se o personagem está caindo e pulou em cima do inimigo
            // Boss não pode ser derrotado pulando em cima
            if (velocityY > 0 && 
                characterY + characterHeight < enemy.y + enemy.height/2 &&
                enemy.type !== 'boss') {
                
                // Matar o inimigo
                enemy.health = 0;
                enemy.element.style.opacity = 0;
                setTimeout(() => {
                    if (enemy.element && enemy.element.parentNode) {
                        game.removeChild(enemy.element);
                    }
                }, 300);
                
                // Fazer o personagem pular um pouco
                velocityY = -8;
                
                // Aumentar pontuação baseado no tipo de inimigo
                let points = enemyKillScore;
                if (enemy.type === 'flying' || enemy.type === 'jumping') {
                    points *= 2;
                }
                score += points;
                scoreDisplay.textContent = 'Pontuação: ' + score;
                
                // Adicionar efeito visual
                const crushEffect = document.createElement('div');
                crushEffect.className = 'crush-effect';
                crushEffect.style.left = `${enemy.x}px`;
                crushEffect.style.top = `${enemy.y}px`;
                game.appendChild(crushEffect);
                
                // Remover o efeito após a animação
                setTimeout(() => {
                    if (crushEffect.parentNode) {
                        game.removeChild(crushEffect);
                    }
                }, 500);
                
            } else {
                // Colisão normal (lateral ou por baixo) - perder uma vida
                if (loseLife('Game Over! Pontuação: ' + score)) {
                    return; // Se retornou true, é game over definitivo
                } else {
                    // Recuar um pouco da colisão
                    characterX = enemy.x > characterX ? characterX - 50 : characterX + 50;
                    character.style.left = characterX + 'px';
                }
            }
        }
    }
    
    // Atualizar projéteis
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.x += projectile.direction * 10;
        projectile.element.style.left = projectile.x + 'px';
        
        // Verificar se o projétil está fora da tela
        if (projectile.x < 0 || projectile.x > gameWidth) {
            // Remover o projétil
            game.removeChild(projectile.element);
            projectiles.splice(i, 1);
            continue;
        }
        
        // Verificar colisão com inimigos
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (enemy.health <= 0) continue; // Pula inimigos já mortos
            
            if (isColliding(projectile, enemy)) {
                // Criar explosão
                createExplosion(projectile.x, projectile.y);
                
                // Remover projétil
                game.removeChild(projectile.element);
                projectiles.splice(i, 1);
                
                // Diminuir vida do inimigo
                enemy.health--;
                
                // Se for o boss e estiver com pouca vida, entrar no estado enraivecido
                if (enemy.type === 'boss' && enemy.health <= 3 && enemy.health > 0) {
                    enemy.element.classList.add('boss-enraged');
                    
                    // Aumentar velocidade do boss quando enraivecido
                    if (!enemy.isEnraged) {
                        enemy.moveSpeed *= 1.5;
                        enemy.isEnraged = true;
                    }
                }
                
                // Se o inimigo morreu
                if (enemy.health <= 0) {
                    enemy.element.style.opacity = 0;
                    setTimeout(() => {
                        if (enemy.element && enemy.element.parentNode) {
                            game.removeChild(enemy.element);
                        }
                    }, 300);
                    
                    // Aumentar pontuação baseado no tipo de inimigo
                    let points = enemyKillScore;
                    if (enemy.type === 'flying' || enemy.type === 'jumping') {
                        points *= 2;
                    } else if (enemy.type === 'boss') {
                        points = bossKillScore;
                        // Reset combo ao derrotar o boss para evitar pontuação excessiva
                        resetCombo();
                    } else {
                        // Incrementar o combo apenas para inimigos normais
                        incrementCombo();
                        
                        // Aplicar multiplicador de combo na pontuação
                        points = Math.floor(points * comboMultiplier);
                        
                        // Efeito especial de morte do boss
                        createBossDeathEffect(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                        
                        // Remover qualquer advertência de ataque pendente
                        if (enemy.warningElement && enemy.warningElement.parentNode) {
                            game.removeChild(enemy.warningElement);
                        }
                        
                        // Efeito em slowmotion por 1 segundo
                        const oldGravity = gravity;
                        gravity = 0.2;
                        setTimeout(() => {
                            gravity = oldGravity;
                        }, 1000);
                        
                        // Mensagem especial ao derrotar o boss
                        const victoryMessage = document.createElement('div');
                        victoryMessage.className = 'victory-message';
                        victoryMessage.textContent = 'BOSS DERROTADO! +' + bossKillScore + ' PONTOS!';
                        victoryMessage.style.fontSize = '24px';
                        victoryMessage.style.color = '#ffff00';
                        victoryMessage.style.textShadow = '0 0 10px #ff0000';
                        victoryMessage.style.position = 'absolute';
                        victoryMessage.style.top = '30%';
                        victoryMessage.style.left = '50%';
                        victoryMessage.style.transform = 'translate(-50%, -50%)';
                        victoryMessage.style.zIndex = '100';
                        game.appendChild(victoryMessage);
                        setTimeout(() => game.removeChild(victoryMessage), 3000);
                    }
                    score += points;
                    scoreDisplay.textContent = 'Pontuação: ' + score;
                }
                
                break;
            }
        }
        
        // Verificar colisão com espinhos (podem ser destruídos por tiros)
        for (let j = spikes.length - 1; j >= 0; j--) {
            const spike = spikes[j];
            if (!spike.destructible) continue;
            
            if (isColliding(projectile, spike)) {
                // Criar explosão
                createExplosion(projectile.x, projectile.y);
                
                // Remover projétil
                game.removeChild(projectile.element);
                projectiles.splice(i, 1);
                
                // Remover espinhos
                game.removeChild(spike.element);
                spikes.splice(j, 1);
                
                // Aumentar pontuação
                score += spikeKillScore;
                scoreDisplay.textContent = 'Pontuação: ' + score;
                break;
            }
        }
    }
    
    // Atualizar bolas de fogo do boss
    for (let i = fireballs.length - 1; i >= 0; i--) {
        const fireball = fireballs[i];
        
        // Mover a bola de fogo
        fireball.x += fireball.direction * fireball.speed;
        fireball.y += Math.sin(Date.now() / 200) * 2; // Movimento oscilatório leve
        
        // Atualizar posição visual
        fireball.element.style.left = fireball.x + 'px';
        fireball.element.style.top = fireball.y + 'px';
        
        // Reduzir tempo de vida
        fireball.lifespan--;
        
        // Verificar se a bola de fogo está fora da tela ou expirou
        if (fireball.x < 0 || fireball.x > gameWidth || fireball.lifespan <= 0) {
            // Remover a bola de fogo
            game.removeChild(fireball.element);
            fireballs.splice(i, 1);
            continue;
        }
        
        // Verificar colisão com o personagem
        if (isColliding(
            {x: characterX, y: characterY, width: characterWidth, height: characterHeight},
            fireball
        )) {
            // Remover a bola de fogo ao colidir
            game.removeChild(fireball.element);
            fireballs.splice(i, 1);
            
            // Perder uma vida se atingido pela bola de fogo
            if (loseLife('Game Over! Você foi queimado por uma bola de fogo! Pontuação: ' + score)) {
                return; // Se retornou true, é game over definitivo
            }
            continue;
        }
    }
    
    // Atualizar explosões
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.lifetime--;
        if (explosion.lifetime <= 0) {
            game.removeChild(explosion.element);
            explosions.splice(i, 1);
        }
    };
    
    // Verificar se todas as moedas foram coletadas
    if (coins.every(coin => coin.collected)) {
        endGame('Parabéns! Você venceu! Pontuação: ' + score);
    }
}

// Inicializar o sistema de combo
function initComboSystem() {
    comboDisplay = document.getElementById('combo');
    resetCombo();
}

// Incrementar o combo quando o jogador derrota um inimigo
function incrementCombo() {
    // Limpar o timeout anterior, se existir
    if (comboTimeout) {
        clearTimeout(comboTimeout);
    }
    
    // Incrementar contador de combo
    comboCount++;
    
    // Ajustar multiplicador com base no combo atual
    if (comboCount >= 10) {
        comboMultiplier = 3;
    } else if (comboCount >= 5) {
        comboMultiplier = 2;
    } else if (comboCount >= 2) {
        comboMultiplier = 1.5;
    } else {
        comboMultiplier = 1;
    }
    
    // Atualizar display de combo
    comboDisplay.textContent = 'Combo: x' + comboMultiplier.toFixed(1);
    comboDisplay.classList.add('combo-active');
    
    // Mostrar texto de combo
    if (comboCount > 1) {
        showComboText();
    }
    
    // Definir tempo limite para resetar o combo
    comboTimer = 5000; // 5 segundos para manter o combo
    comboTimeout = setTimeout(resetCombo, comboTimer);
}

// Mostrar texto de combo flutuante
function showComboText() {
    const comboText = document.createElement('div');
    comboText.className = 'combo-text';
    comboText.textContent = comboCount + ' HIT COMBO!';
    comboText.style.left = (characterX + 30) + 'px';
    comboText.style.top = (characterY - 40) + 'px';
    game.appendChild(comboText);
    
    // Remover o texto após a animação
    setTimeout(() => {
        if (comboText.parentNode) {
            game.removeChild(comboText);
        }
    }, 1000);
}

// Resetar o combo
function resetCombo() {
    comboCount = 0;
    comboMultiplier = 1;
    comboTimer = 0;
    
    if (comboDisplay) {
        comboDisplay.textContent = 'Combo: x1';
        comboDisplay.classList.remove('combo-active');
    }
}

// Função para atualizar o display de vidas
function updateLivesDisplay() {
    const livesDisplay = document.getElementById('lives');
    // Limpar o conteúdo atual
    livesDisplay.innerHTML = 'Vidas: ';
    
    // Adicionar ícones de vida de acordo com o número atual de vidas
    for (let i = 0; i < playerLives; i++) {
        const lifeIcon = document.createElement('span');
        lifeIcon.className = 'life-icon';
        livesDisplay.appendChild(lifeIcon);
    }
}

// Função para perder uma vida
function loseLife(damageMessage) {
    // Resetar combo quando o jogador é atingido
    resetCombo();
    
    // Se o jogador tem escudo ativo, não perde vida
    if (hasShield) {
        // Desativar o escudo
        hasShield = false;
        shieldTimer = 0;
        
        // Remover o efeito visual do escudo
        const shieldEffect = document.querySelector('.shield-effect');
        if (shieldEffect) {
            game.removeChild(shieldEffect);
        }
        
        // Mostrar mensagem de escudo destruido
        const shieldMessage = document.createElement('div');
        shieldMessage.className = 'message';
        shieldMessage.textContent = 'Escudo destruido!';
        shieldMessage.style.position = 'absolute';
        shieldMessage.style.left = characterX + 'px';
        shieldMessage.style.top = (characterY - 30) + 'px';
        shieldMessage.style.color = 'white';
        shieldMessage.style.textShadow = '0 0 5px blue';
        shieldMessage.style.zIndex = '100';
        game.appendChild(shieldMessage);
        
        // Remover a mensagem após alguns segundos
        setTimeout(() => {
            if (shieldMessage.parentNode) {
                game.removeChild(shieldMessage);
            }
        }, 1500);
        
        return false; // Não continua o processamento de perda de vida
    }
    
    // Reduzir uma vida
    playerLives--;
    
    // Atualizar o display de vidas
    updateLivesDisplay();
    
    // Verificar se ainda tem vidas
    if (playerLives <= 0) {
        // Game over definitivo
        endGame(damageMessage);
        return true;
    } else {
        // Efeito visual de dano
        character.classList.add('character-hit');
        setTimeout(() => character.classList.remove('character-hit'), 300);
        
        // Invulnerabilidade temporária
        const temporaryInvulnerability = 1500; // 1.5 segundos
        hasShield = true;
        shieldTimer = temporaryInvulnerability;
        
        // Adicionar efeito visual de invulnerabilidade
        const shieldEffect = document.createElement('div');
        shieldEffect.className = 'shield-effect';
        shieldEffect.style.left = (characterX - 10) + 'px';
        shieldEffect.style.top = (characterY - 10) + 'px';
        game.appendChild(shieldEffect);
        
        // Remover o efeito após o tempo de invulnerabilidade
        setTimeout(() => {
            if (!gameOver && shieldEffect.parentNode) {
                game.removeChild(shieldEffect);
                hasShield = false;
            }
        }, temporaryInvulnerability);
        
        return false; // Não é game over ainda
    }
}

// Função para finalizar o jogo e mostrar mensagem
function endGame(message) {
    gameOver = true;
    
    // Parar loops de jogo
    clearInterval(gameLoop);
    if (difficultyTimer) clearInterval(difficultyTimer);
    
    // Obter a posição atual do personagem
    const characterElement = document.getElementById('character');
    const characterRect = characterElement.getBoundingClientRect();
    const gameRect = game.getBoundingClientRect();
    
    // Calcular a posição relativa ao jogo
    const relativeLeft = characterRect.left - gameRect.left;
    const relativeTop = characterRect.top - gameRect.top;
    
    // Exibir mensagem de fim de jogo na posição do personagem
    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over';
    gameOverDiv.innerHTML = `
        <h2>${message}</h2>
        <p>Pressione ESPAÇO para reiniciar</p>
    `;
    
    // Posicionar a div do game over
    gameOverDiv.style.left = `${relativeLeft}px`;
    gameOverDiv.style.top = `${relativeTop - 150}px`; // Um pouco acima do personagem
    
    game.appendChild(gameOverDiv);
    
    // Adicionar event listener para reiniciar com espaço
    window.addEventListener('keydown', restartOnSpace);
}

// Função para reiniciar o jogo quando pressionar espaço
function restartOnSpace(e) {
    if (e.key === ' ' && gameOver) {
        // Remover listener para evitar duplicação
        window.removeEventListener('keydown', restartOnSpace);
        
        // Remover mensagem de game over
        const gameOverDiv = document.querySelector('.game-over');
        if (gameOverDiv) {
            game.removeChild(gameOverDiv);
        }
        
        // Limpar o jogo
        resetGame();
    }
}

// Resetar o jogo para o estado inicial
function resetGame() {
    // Resetar estado do jogo
    score = 0;
    scoreDisplay.textContent = 'Pontuação: 0';
    characterX = 50;
    characterY = gameHeight - characterHeight - 40;
    velocityY = 0;
    isJumping = false;
    isMovingLeft = false;
    isMovingRight = false;
    isFacingLeft = false;
    gameOver = false;
    lastShootTime = 0;
    cameraPosX = 0;
    
    // Resetar a posição da câmera
    game.style.transform = 'translateX(0)';
    
    // Remover todos os elementos de jogo existentes
    platforms.forEach(platform => game.removeChild(platform.element));
    coins.forEach(coin => {
        if (coin.element.parentNode) {
            game.removeChild(coin.element);
        }
    });
    enemies.forEach(enemy => {
        if (enemy.element.parentNode) {
            game.removeChild(enemy.element);
        }
    });
    projectiles.forEach(projectile => {
        if (projectile.element.parentNode) {
            game.removeChild(projectile.element);
        }
    });
    explosions.forEach(explosion => {
        if (explosion.element.parentNode) {
            game.removeChild(explosion.element);
        }
    });
    spikes.forEach(spike => {
        if (spike.element.parentNode) {
            game.removeChild(spike.element);
        }
    });
    holes.forEach(hole => {
        if (hole.element.parentNode) {
            game.removeChild(hole.element);
        }
    });
    
    // Limpar arrays
    platforms = [];
    coins = [];
    enemies = [];
    projectiles = [];
    explosions = [];
    spikes = [];
    holes = [];
    
    // Resetar posição e direção do personagem
    character.style.left = characterX + 'px';
    character.style.top = characterY + 'px';
    character.classList.remove('facing-left');
    
    // Reiniciar o jogo
    setupLevel();
    gameLoop = setInterval(update, 20);
    difficultyTimer = setInterval(increaseDifficulty, 15000); // Aumentado para 15 segundos
}

// Inicializar o jogo
// Criar boss
function createBoss(x) {
    // Calculando a posição Y para que o boss fique no chão
    const y = gameHeight - 100 - groundLevel; // altura do jogo - altura do boss - groundLevel
    
    const boss = document.createElement('div');
    boss.className = 'boss';
    boss.style.left = x + 'px';
    boss.style.bottom = groundLevel + 'px'; // Posicionando em relação à parte inferior
    game.appendChild(boss);
    
    enemies.push({
        element: boss,
        x: x,
        y: y,
        width: 100,
        height: 100,
        type: 'boss',
        direction: -1,
        health: 8,  // Boss mais difícil de derrotar
        moveSpeed: 3, // Movimentação mais rápida
        attackCooldown: 0,
        fireballCooldown: 0, // Novo cooldown para ataques de fogo
        verticalRange: 20, // Agora o boss se move verticalmente um pouco
        initialY: y
    });
}

// Criar bola de fogo do boss (usando apenas CSS)
function createBossFireball(x, y, direction) {
    // Criar elemento da bola de fogo
    const fireball = document.createElement('div');
    fireball.className = 'boss-fireball';
    
    // Criar elementos internos para o efeito de fogo
    const fireCore = document.createElement('div');
    fireCore.className = 'fire-core';
    fireball.appendChild(fireCore);
    
    const fireGlow = document.createElement('div');
    fireGlow.className = 'fire-glow';
    fireball.appendChild(fireGlow);
    
    // Partículas de fogo
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.className = 'fire-particle';
        particle.style.animationDelay = (i * 0.1) + 's';
        particle.style.transform = `translate(-50%, -50%) rotate(${i * 60}deg)`;
        fireball.appendChild(particle);
    }
    
    // Posicionar a bola de fogo
    fireball.style.left = x + 'px';
    fireball.style.top = y + 'px';
    game.appendChild(fireball);
    
    // Adicionar a bola de fogo à lista
    fireballs.push({
        element: fireball,
        x: x,
        y: y,
        width: 40,
        height: 40,
        direction: direction,
        speed: 6, // Velocidade da bola de fogo
        damage: 1, // Dano causado ao jogador
        lifespan: 200 // Quantidade de frames que a bola de fogo permanece ativa
    });
}

// Criar power-up aleatório
function createRandomPowerUp(x, y) {
    // Tipos de power-ups: escudo, velocidade, força
    const types = ['shield', 'speed', 'strength'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    createPowerUp(x, y, randomType);
}

// Criar power-up específico
function createPowerUp(x, y, type) {
    const powerUp = document.createElement('div');
    powerUp.className = 'power-up power-up-' + type;
    powerUp.style.left = x + 'px';
    powerUp.style.top = y + 'px';
    game.appendChild(powerUp);
    
    powerUps.push({
        element: powerUp,
        x: x,
        y: y,
        width: 30,
        height: 30,
        type: type,
        collected: false
    });
}

// Função para ajustar o jogo quando a tela for redimensionada
function handleResize() {
    // Atualiza as dimensões do jogo baseado no novo tamanho da janela
    const newViewportWidth = window.innerWidth;
    const newGameWidth = newViewportWidth * 3;
    const newGameHeight = window.innerHeight;
    
    // Atualiza as variáveis globais
    Object.defineProperty(window, 'viewportWidth', { value: newViewportWidth });
    Object.defineProperty(window, 'gameWidth', { value: newGameWidth });
    Object.defineProperty(window, 'gameHeight', { value: newGameHeight });
    
    // Atualiza a posição do chão
    ground.style.width = newGameWidth + 'px';
    
    // Recalcula a posição do personagem para garantir que ele esteja no chão
    characterY = newGameHeight - characterHeight - groundLevel;
    character.style.top = characterY + 'px';
    
    // Atualiza a câmera
    updateCamera();
}

function init() {
    // Inicializar o sistema de combo
    initComboSystem();
    
    // Inicializar o display de vidas
    updateLivesDisplay();
    
    // Adicionar listener para redimensionamento da janela
    window.addEventListener('resize', handleResize);
    
    // Configurar controles de teclado
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') isMovingLeft = true;
        if (e.key === 'ArrowRight') isMovingRight = true;
        if (e.key === 'ArrowUp' || e.key === ' ') jump();
        if (e.key === 'Control' || e.key === 'z' || e.key === 'Z') createProjectile();
        
        // Debug para verificar qual tecla está sendo pressionada
        console.log('Tecla pressionada:', e.key);
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') isMovingLeft = false;
        if (e.key === 'ArrowRight') isMovingRight = false;
    });
    
    // Configurar controles de botões
    leftBtn.addEventListener('mousedown', () => isMovingLeft = true);
    leftBtn.addEventListener('mouseup', () => isMovingLeft = false);
    leftBtn.addEventListener('touchstart', () => isMovingLeft = true);
    leftBtn.addEventListener('touchend', () => isMovingLeft = false);
    
    rightBtn.addEventListener('mousedown', () => isMovingRight = true);
    rightBtn.addEventListener('mouseup', () => isMovingRight = false);
    rightBtn.addEventListener('touchstart', () => isMovingRight = true);
    rightBtn.addEventListener('touchend', () => isMovingRight = false);
    
    jumpBtn.addEventListener('click', jump);
    jumpBtn.addEventListener('touchstart', jump);
    
    // Configurar botão de tiro
    shootBtn.addEventListener('click', createProjectile);
    shootBtn.addEventListener('touchstart', createProjectile);
    
    // Configurar o nível
    setupLevel();
    
    // Iniciar loop do jogo
    gameLoop = setInterval(update, 20);
    
    // Aumentar dificuldade com o tempo
    difficultyTimer = setInterval(increaseDifficulty, 10000); // a cada 10 segundos
}

// Iniciar o jogo quando a página carregar
window.onload = init;