var clicks = 0;

$(document).ready(function() {
  $('.container').mouseenter(function() {
    if (clicks == 0) {
      $('.card').stop().animate({
        top: '-90px'
      }, 'slow');
    }
  }).mouseleave(function() {
    if (clicks == 0) {
      $('.card').stop().animate({
        top: 0
      }, 'slow');
    }
  });

  $('.container').click(function() {
    if (clicks == 0) {
      clicks++;
      $('.card').animate({
        top: '-500px'
      }, 'slow');

      $(".card").delay(1000).show(0, function() {
        $('.card').css('transform', 'scale(2.5)');
        $('.card').addClass('card0');
      });

      $(".envelope").fadeTo("slow", 0);
      $(".front").fadeTo("slow", 0);
      $(".shadow").fadeTo("slow", 0);
      $(".text").fadeOut("slow");
      $(".heart").fadeOut("slow");

      $('.card').animate({
        top: '0px'
      }, 'slow');
    }
  });

  $('.container').click(function() {
    if (clicks == 1 && $('.card').hasClass('card0')) {
      clicks++;
      $('.card').animate({
        top: '-700px'
      }, 'slow');

      $(".card").delay(1000).show(0, function() {
        $('.card').addClass('card1');
      });

      $('.card').animate({
        top: '0px'
      }, 'slow');
    }
  });

  $('.container').click(function() {
    if (clicks == 2 && $('.card').hasClass('card1')) {
      clicks++;
      $('.card').animate({
        top: '-700px'
      }, 'slow');

      $(".card").delay(1000).show(0, function() {
        $('.card').addClass('card2');
      });

      $('.card').animate({
        top: '0px'
      }, 'slow');
    }
  });

  $('.container').click(function() {
    if (clicks == 3 && $('.card').hasClass('card2')) {
      clicks++;
      $('.card').animate({
        top: '-700px'
      }, 'slow');

      $(".card").delay(1000).show(0, function() {
        $('.card').addClass('card3');
      });
      
      $('.card').animate({
        top: '0px'
      }, 'slow');
    }
  });

  $('.container').click(function() {
    if (clicks == 4 && $('.card').hasClass('card3')) {
      clicks++;
      $('.card').animate({
        top: '-700px'
      }, 'slow');

      $(".card").delay(1000).show(0, function() {
        $('.card').addClass('card4');
      });
      
      $('.card').animate({
        top: '0px'
      }, 'slow');
    }
  });

  $('.container').click(function() {
    if (clicks == 5 && $('.card').hasClass('card4')) {
      clicks++;
      $('.card').animate({
        top: '-700px'
      }, 'slow');

      $(".card").delay(1000).show(0, function() {
        $('.card').addClass('card5');
      });
      
      $('.card').animate({
        top: '0px'
      }, 'slow');
    }
  });

  $('.container').click(function() {
    if (clicks == 6 && $('.card').hasClass('card5')) {
      clicks++;
      $('.card').animate({
        top: '-700px'
      }, 'slow');

      $(".card").delay(1000).show(0, function() {
        $('.card').addClass('card6');
      });
      
      $('.card').animate({
        top: '0px'
      }, 'slow');
    }
  });
});