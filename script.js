var config = {
	width: 64,
	height: 64,
	renderer: Phaser.AUTO,
	antialias: false,
	resolution: 1,
	state: {
        preload: preload,
        create:  create,
        update:  update
    }
}

var game      =  new Phaser.Game(config),
	polygons  =  [],
	skew      =  0,
	speed     =  0,
	maxSpeed  =  12,
	bike, background,
	enemies   = [],
	logo, gameStarted, logoInvisible,
	text, score = 0,
	fuel = 50, mainVector,
	obstacles, skews = [],
	driveSound = [],
	gameOver, music;

function preload() {
	game.load.image("background", "assets/sprites/background.png");
	game.load.image("bike", "assets/sprites/bike3.png");
	game.load.image("sun", "assets/sprites/sun3.png");
	game.load.image("city", "assets/sprites/city.png");
	game.load.image("biker", "assets/sprites/biker1.png");
	game.load.image("logo", "assets/sprites/logo2.png");
	game.load.image("endscreen", "assets/sprites/endscreen2.png");

	game.load.audio("intro", ["assets/sfx/intro.wav", "assets/sfx/intro.ogg", "assets/sfx/intro.mp3"]);
	game.load.audio("music", ["assets/sfx/music.wav", "assets/sfx/music.ogg", "assets/sfx/music.mp3"]);
	game.load.audio("engine1", ["assets/sfx/engine1.wav", "assets/sfx/engine1.ogg", "assets/sfx/engine1.mp3"]);
	game.load.audio("engine2", ["assets/sfx/engine2.wav", "assets/sfx/engine2.ogg", "assets/sfx/engine2.mp3"]);
	game.load.audio("engine3", ["assets/sfx/engine3.wav", "assets/sfx/engine3.ogg", "assets/sfx/engine3.mp3"]);
	game.load.audio("brake", ["assets/sfx/brake.wav", "assets/sfx/brake.ogg", "assets/sfx/brake.mp3"]);
	game.load.audio("collision", ["assets/sfx/collison.wav", "assets/sfx/collison.ogg", "assets/sfx/collison.mp3"]);

	game.load.bitmapFont('thefont', 'assets/font.png', 'assets/font.xml');
}

function create() {
	gameOver = false;
	fuel = 50;
	gameStarted = false;
	logoInvisible = false;

	skews = [];
	enemies = [];
	driveSound = [];

	skew      =  0;
	speed     =  0;
	score     =  0;

	music = game.add.audio('intro');
    music.play();
    music.onStop.add(function(){
    	if (!gameOver) {
    		var weird = game.add.audio('music');
    		weird.play("", 0, 1, true, true);
    	}
    })

    driveSound.push(game.add.audio('engine1'));
    driveSound.push(game.add.audio('engine2'));
    driveSound.push(game.add.audio('engine3'));
    driveSound.push(game.add.audio('brake'));
    driveSound.push(game.add.audio('collision'));

    text = game.add.text(2, 2, "", {fontSize: 6});

	background = game.add.sprite(-92, -8, "background");
	background.pivot.y = 0.5;

	var sun = game.add.sprite(32, 38, "sun");
	sun.anchor.x = 0.5;
	sun.anchor.y = 1;

	background = game.add.sprite(32, 38, "city");
	background.anchor.x = 0.5;
	background.anchor.y = 1;
	background.scale.y = 0.5;


	graphics = game.add.graphics(32, 5);

	polygons = generateRoad(196, 32, 0.8, 16);

	drawRoad(polygons);

	this.game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
	this.game.scale.setUserScale(8, 8);
	this.game.renderer.renderSession.roundPixels = false;
	Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);

	obstacles = game.add.group();

	bike = game.add.sprite(32, 44, "bike");
	bike.anchor.x = 0.5;

	logo = game.add.sprite(0, 12, "logo");
    text = game.add.bitmapText(1, 1, 'thefont','', 9);
}

function update() {
	if (gameStarted && logoInvisible)
		gameStart();
	else if (gameStarted && !logoInvisible)
		hideLogo();
	else if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR) && !gameOver)
		gameStarted = true;
	else if (gameOver && game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
		game.sound.stopAll();
		game.state.restart(true, true);
	}

	if (fuel <= 0 && !gameOver)
		death();
}

function hideLogo() {
	if (logo.y > -47)
		logo.y -= 1;
	else
		logoInvisible = true;
}

function death() {
	gameStarted = false;
	gameOver = true;

	game.add.sprite(0, 0, "endscreen");
	var endText = game.add.bitmapText(32, 32, "thefont", game.math.roundTo(score), 12);
	endText.anchor.x = 0.5;
	endText.anchor.y = 0.5;
}

function gameStart(){
	var oldPolygons = polygons;
	text.text = "FUEL:" + game.math.roundTo(fuel) + " DIST:" + game.math.roundTo(score);

	if (game.input.keyboard.isDown(Phaser.Keyboard.W))
		linAccel(1.5);
	else if (game.input.keyboard.isDown(Phaser.Keyboard.S))
		linAccel(-maxSpeed);
	else
		linAccel(-2);

	moveForward(speed);

	if (game.input.keyboard.isDown(Phaser.Keyboard.D) && !game.input.keyboard.isDown(Phaser.Keyboard.A)) {
		skewRoad(polygons, -speed);
		drawRoad(polygons);
	} else if (game.input.keyboard.isDown(Phaser.Keyboard.A) && !game.input.keyboard.isDown(Phaser.Keyboard.D)) {
		skewRoad(polygons, speed);
		drawRoad(polygons);
	} else {
		bike.rotation = 0;
	}

	//enemyMoving(mainVector, 1);
	drawRoad(polygons);
}

function drawRoad(roadSegments) {
	graphics.clear();

	for (var i = 0; i < roadSegments.length; i++) {

		if (i % 2)
			graphics.beginFill(0x40C4FF, 1);
		else
			graphics.beginFill(0x40C4FF, 0.5);

		graphics.drawPolygon(roadSegments[i]);
		graphics.endFill();
	}
}

function generateRoad(width, height, scalingFactor, segmentAmount) {
	var roadSegments = [];

	var segmentHeight     = height * (1 - scalingFactor),
		segmentHalfBottom = width / 2,
		segmentHalfTop    = width / 2 * scalingFactor,
		roadHeight        = 64;

	for (var i = segmentAmount; i > 0; i--) {
		var polygon = new Phaser.Polygon(- segmentHalfBottom, roadHeight, 
							 			 - segmentHalfTop,    roadHeight - segmentHeight, 
							 		 	 segmentHalfTop,    roadHeight - segmentHeight, 
							 			 segmentHalfBottom, roadHeight);

		roadSegments.push(polygon);

		segmentHalfBottom = segmentHalfTop;
		segmentHalfTop = segmentHalfTop * scalingFactor;
		roadHeight = roadHeight - segmentHeight;
		segmentHeight  = segmentHeight  * scalingFactor;
	}

	roadSegments.forEach(function(elem){
		console.log(elem.points);
	})
	return roadSegments;
}

function skewRoad(roadSegments, coef) {
	var touchesLeftBorder = roadSegments[0].points[0].x > roadSegments[15].points[1].x && coef > 0;
	var touchesRightBorder = roadSegments[0].points[3].x < roadSegments[15].points[2].x && coef < 0;

	coef /= 2;

	if (touchesLeftBorder || touchesRightBorder) {
		maxSpeed = 3;
		return;
	} else if (maxSpeed != 12) {
		maxSpeed = 12;
	}

	var len1 = roadSegments.length;
	for (var i = 0; i < len1; i++) {
		var len2 = roadSegments[i].points.length;
		skews.push([]);
		for (var k = 0; k < len2; k++) {
			var bindoh = (roadSegments[i].points[k].y + 1) * 0.01 * coef;
			roadSegments[i].points[k].x += bindoh;
			skews[i].push(bindoh);
			if (i === len1 - 1 && k === len2 - 1) {
				skew = (roadSegments[i].points[k].y + 1) * 0.011 * coef;
				graphics.x -= skew * graphics.scale.x;
			}
		}
	}

	bike.rotation = -0.025 * coef;
	polygons = roadSegments;
}

function moveForward(speed) {
	var center = (polygons[15].points[1].x + polygons[15].points[2].x) / 2;

	mainVector = {
		topX: center,		
		botX: (polygons[0].points[0].x + polygons[0].points[3].x) / 2
	}

	graphics.scale.x += speed * 0.01;
	graphics.scale.y += speed * 0.01;

	graphics.y -= speed * 0.01 * 32;
	graphics.x = 32 - center * graphics.scale.x;

	obstacles.x = 32 + center;

	if (graphics.scale.x > 1.5) {
		graphics.scale.x = 1;
		graphics.scale.y = 1;

		graphics.y = 5;
		graphics.x = 32 - center;

		// enemies.forEach(function(element){
		// 	if (element.polygon > 0) {
		// 		element.polygon--;
		// 		//element.leftOver += element.multiplier;
		// 		element.multiplier = 1 / element.polygon;
		// 	}
		// })
	}

	score += speed/20;

	if (speed != 0)
		fuel -= (maxSpeed / (speed + 1)) / 150;

	if (enemies.length == 0)
		createEnemy(32 - obstacles.x, 32);
	enemyMoving(0, 0);


}

function roundEven(number) {
	var value = game.math.floorTo(number);

	if (value % 2)
		return value + 1;
	else
		return value;
}

function linAccel(coef) {
	speed += coef * 0.01;
	speed = game.math.clamp(speed, 0, maxSpeed);

	if (coef < -3 && speed > 0)
		driveSound[3].play('', 0, 0.3, false, false);
	else if (speed > 10)
		driveSound[2].play('', 0, 0.3, false, false);
	else if (speed > 5)
		driveSound[1].play('', 0, 0.3, false, false);
	else if (speed > 1)
		driveSound[0].play('', 0, 0.3, false, false);
}

function createEnemy(positionX, positionY) {
	var obj = {
		polygon: 15,
		sprite: obstacles.create(positionX, positionY, "biker"),
		position: enemies.length,
		multiplier: 0.5,
		leftOver: 0
	}

	enemies.push(obj);
	var num = enemies.length - 1;
	enemies[num].sprite.anchor.x = 0.5;
	enemies[num].sprite.anchor.y = 0.3;
	enemies[num].sprite.scale.x = enemies[num].multiplier;
	enemies[num].sprite.scale.y = enemies[num].multiplier;
	game.physics.arcade.enable(enemies[num].sprite);
}

function enemyMoving(position) {
	enemies.forEach(function(element){
		game.physics.arcade.moveToXY(element.sprite, graphics.x - obstacles.x, element.sprite.y, speed + (element.sprite.y - 32));
		game.physics.arcade.moveToXY(element.sprite, element.sprite.x, 76, speed + (element.sprite.y - 32));

		element.sprite.scale.x = (element.sprite.y - 29) / 16;
		element.sprite.scale.y = element.sprite.scale.x;

		if (element.sprite.y > 56) {
			checkCollision(element.sprite);
			element.sprite.kill();
			enemies.pop(0);
		}

	})
}

function checkCollision(sprite) {
    var boundsA = sprite.getBounds();
    var boundsB = new Phaser.Rectangle(32, 31, 1, 32);

    if (Phaser.Rectangle.intersects(boundsA, boundsB)) {
    	driveSound.forEach(function(sfx){
			sfx.stop();
		})

		driveSound[4].play('', 0, 0.3, false, false);
    	fuel -= 10;
		speed = 0;
	}
}