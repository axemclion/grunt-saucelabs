beforeEach(function() {
  this.addMatchers({
    toBePlaying: function(expectedSong) {
      const player = this.actual;
      return player.currentlyPlayingSong === expectedSong &&
             player.isPlaying;
    },
  });
});
