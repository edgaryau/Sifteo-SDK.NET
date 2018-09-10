import math
from sift.util.color import Color

"""
Isolate some big ugly chunks of painting and layout logic.
"""
import sift.util.font
import maker, maker_font_verdana_bold_18, maker_font_verdana_bold_24, maker_font_verdana_bold_48, maker_font_verdana_bold_84

def paint_score(game_data, siftable):
    siftable.image("ui_menu_bg")
    maker_font_verdana_bold_18.FONT.paint(siftable, 
                                       72, 
                                       12, 
                                       "SCORE", 
                                       area=(44,24), 
                                       alignment=(sift.util.font.ALIGNMENT_CENTER,
                                                  sift.util.font.ALIGNMENT_TOP), 
                                       scale=1)
    maker_font_verdana_bold_24.FONT.paint(siftable, 
                                          72, 
                                          36, 
                                          str(game_data['correct_answers']), 
                                          area=(44,24), 
                                          alignment=(sift.util.font.ALIGNMENT_CENTER,
                                                     sift.util.font.ALIGNMENT_TOP), 
                                          scale=1)
    siftable.image("progressb", 0, 11)
    if game_data['newhigh']:
        siftable.image("progressa", 6, 46)
    elif game_data['toolow']:
        siftable.image("progressc", 10, 20)

def paint_highs(game_data, siftable):
    siftable.image("ui_menu_bg")
    maker_font_verdana_bold_24.FONT.paint(siftable, 
                                          8, 
                                          8, 
                                          "HIGH\nSCORES", 
                                          area=(112,48), 
                                          alignment=(sift.util.font.ALIGNMENT_CENTER,
                                                     sift.util.font.ALIGNMENT_TOP), 
                                          scale=1)
    didhigh = False
    hstr = "\n".join([str(s) for s in game_data['scores']])
    maker_font_verdana_bold_18.FONT.paint(siftable, 
                                       8, 
                                       60, 
                                       hstr, 
                                       area=(112,68), 
                                       alignment=(sift.util.font.ALIGNMENT_CENTER,
                                                  sift.util.font.ALIGNMENT_TOP), 
                                       scale=1)
    if game_data['newhigh']:
        hindex = -1
        try:
            hindex = game_data['scores'].index(game.correct_answers)
        except ValueError:
            pass
        if hindex >= 0:
            y = 60 + maker_font_verdana_bold_18.FONT.line_height * hindex - 3
            siftable.image("menuicons", 72, y, 0, 48, 24, 24)

def paint_postgame_splash(game_data, siftable):
    if game['newhigh']:
        siftable.image("endwin")
    elif game['toolow']:
        siftable.image("endlose")
    else:
        siftable.image("mountainbga")

def _paint_results(game_data):
    siftables = game_data['siftables']
    score_sift = None
    high_sift = None
    splash_sift = None
    if len(siftables) > 0:
        score_sift = siftables[0]
    if len(siftables) > 1:
        high_sift = siftables[1]
    if len(siftables) > 2:
        splash_sift = siftables[2]
    if score_sift:
        paint_score(game_data, score_sift)
    if high_sift:
        paint_highs(game_data, high_sift)
    if splash_sift:
        paint_postgame_splash(game_data, splash_sift)
    if len(siftables) > 3:
        for s in siftables[3:]:
            s.image("ui_menu_bg")
            s.image("gesturepress", 48, 48, 0, 0, 32, 32)


class GamePainter:
    """
    Delegate for layout and painting logic.
    """
    def __init__(self, app):
        self.app = app
        self.siftables = self.app.siftables
        self.puzzle_bg = "gamebg"

    def paint_puzzle_bg(self, siftable):
        self.puzzle_bg = "gamebg"
        siftable.image(self.puzzle_bg)
        self._paint_neighbor_connector(siftable)
    
    def paint_puzzle_text(self, 
                          siftable, 
                          text, 
                          font=maker_font_verdana_bold_48.FONT, 
                          time_remaining=float("inf"), 
                          time_max=float("inf"), 
                          time_low=False):
#            print "paint text %s" % self._puzzle_piece_text
        font.paint(siftable, 
                   0, 
                   3, 
                   text, 
                   area=(128,98), 
                   alignment=(sift.util.font.ALIGNMENT_CENTER, 
                              sift.util.font.ALIGNMENT_MIDDLE), 
                   wrap=False)

        if time_max != float("inf"):
            # if there is a time limit, paint the timer bar
            # First paint the timer bar frame image
            siftable.image("timer_bar", 22, 111)
            # Next paint the actual bar
            if time_low:
                color = (218,109,85)    # low time, red
            else:
                color = (0,218,0)       # default, green
            width = time_remaining/time_max * 80
            siftable.rect(24, 113, width, 9, color)

    def _paint_neighbor_connector(self, siftable):
        """
        draws "neighbored indicators on the left and/or right,
        depending on if the siftable is neighbored on that side
        """ 
        y_coords = (9, 24, 69, 84)
        if siftable.neighbors.left and siftable.neighbors.left.neighbors.right is siftable:
            for y in y_coords:
                siftable.image("connector_left", 0, y)
        if siftable.neighbors.right and siftable.neighbors.right.neighbors.left is siftable:
            for y in y_coords:
                siftable.image("connector_right", 120, y)
        
    def paint_puzzle_borders(self, 
                             siftable, 
                             puzzle_piece_siftables=[], 
                             solve_attempted=False, 
                             is_correct=False):
        if solve_attempted and siftable in puzzle_piece_siftables:
            if is_correct:
                image_prefix = "correct_"
            else:
                image_prefix = "incorrect_"
            puzzle_neighbor_r = siftable.neighbors.right and siftable.neighbors.right in puzzle_piece_siftables 
            puzzle_neighbor_l = siftable.neighbors.left and siftable.neighbors.left in puzzle_piece_siftables
            image = None 
            if puzzle_neighbor_l and puzzle_neighbor_r:
                image = image_prefix + "middle"
            elif puzzle_neighbor_l:
                image = image_prefix + "right"
            elif puzzle_neighbor_r:
                image = image_prefix + "left"
            else:
				image = image_prefix + "single"
            if image:
                siftable.image(image)

#    def paint_puzzle_state_frame(self, puzzle, siftable):
#        pass
#        """
#        puz = self.app.get_puzzle()
#        if puz:
#            x,y,w,h = puz.get_state_bounds(siftable)
#            if x > -1 and y > -1 and w > -1 and h > -1:
#                siftable.image("borders", x-4, y-4, 0, 0, 8, 8, rotation=0)
#                siftable.image("borders", x-4, y+h-4, 0, 0, 8, 8, rotation=1)
#                siftable.image("borders", x+w-4, y+h-4, 0, 0, 8, 8, rotation=2)
#                siftable.image("borders", x+w-4, y-4, 0, 0, 8, 8, rotation=3)
#                siftable.rect(x+4, y-4, w-8, h+8, COLOR_BG)
#                siftable.rect(x-4, y+4, w+8, h-8, COLOR_BG)
#        """
#    def paint_sprite(self, siftable, sprite):
#        siftable.image(self.puzzle_bg, 48, 80, 48, 80, 32, 48)
#        x,y,w,h = self.game.puzzle.get_state_bounds(siftable)
#        if y+h+4 > 80:
#            siftable.rect(48, 80, 32, y+h+4-80, COLOR_BG)
#        self.paint_timer(siftable)
#        sprite.imageDraw(siftable, 48, 80)

    def update_neighbor_marks(self, siftable):
        #a = self.paint_puzzle_borders(siftable)
        if siftable.neighbors.up:
            siftable.image("borders", 52, 0, 26, 640, 12, 4, scale=2)
        else:
            siftable.image(self.puzzle_bg, 0, 0, 0, 0, 128, 8)
        if siftable.neighbors.left:
            siftable.image("borders", 0, 52, 26, 640, 12, 4, scale=2, rotation=1)
        else:
            siftable.image(self.puzzle_bg, 0, 0, 0, 0, 8, 128)
        if siftable.neighbors.down:
            siftable.image("borders", 52, 120, 26, 640, 12, 4, scale=2, rotation=2)
        else:
            siftable.image(self.puzzle_bg, 0, 120, 0, 120, 128, 8)
        if siftable.neighbors.right:
            siftable.image("borders", 120, 52, 26, 640, 12, 4, scale=2, rotation=3)
        else:
            siftable.image(self.puzzle_bg, 120, 0, 120, 0, 8, 128)

    def paint_results(self):
        _paint_results(self.app.get_game_data())

def calc_string_bounds_num24(msg):
    x,y,w,h = -1,-1,-1,-1
    chars = maker_font_verdana_bold_24.FONT._build_lines(msg, area=(128,128), alignment=(sift.util.font.ALIGNMENT_CENTER, sift.util.font.ALIGNMENT_MIDDLE), scale=1)
    x,y = chars[0][0][1], chars[0][0][2]
    w,h = chars[-1][-1][1] + chars[-1][-1][5] - x, chars[-1][-1][2] + chars[-1][-1][6] - y
    return x-2,y,w+4,h

def paint_string_num24(siftable, msg):
    maker_font_verdana_bold_24.FONT.paint(siftable, 0, 0, msg, area=(128,128), alignment=(sift.util.font.ALIGNMENT_CENTER, sift.util.font.ALIGNMENT_MIDDLE), scale=1)

def calc_string_bounds_num84(msg):
    x,y,w,h = -1,-1,-1,-1
    chars = maker_font_verdana_bold_84.FONT._build_lines(msg, area=(128,84), alignment=(sift.util.font.ALIGNMENT_CENTER, sift.util.font.ALIGNMENT_MIDDLE), scale=1)
    x,y = chars[0][0][1], chars[0][0][2]
    w,h = chars[-1][-1][1] + chars[-1][-1][5] - x, chars[-1][-1][2] + chars[-1][-1][6] - y
    return x-2,24+y,w+4,h-20

def paint_string_num84(siftable, msg):
    maker_font_verdana_bold_84.FONT.paint(siftable, 0, 16, msg, area=(128,84), alignment=(sift.util.font.ALIGNMENT_CENTER, sift.util.font.ALIGNMENT_MIDDLE), scale=1)

def calc_string_bounds_frac48(frac):
    numerbounds = maker_font_verdana_bold_48.FONT._build_lines(str(frac[0]), area=(62,60), alignment=(sift.util.font.ALIGNMENT_RIGHT, sift.util.font.ALIGNMENT_BOTTOM), scale=1)
    numerchar = numerbounds[0][0]
    denombounds = maker_font_verdana_bold_48.FONT._build_lines(str(frac[1]), area=(46,48), alignment=(sift.util.font.ALIGNMENT_LEFT, sift.util.font.ALIGNMENT_TOP), scale=1)
    denomchar = denombounds[-1][-1]
    x,y = numerchar[1], numerchar[2]
    w,h = 65+denomchar[5]-x, 52+denomchar[6]-y
    return x,y,w,h

def paint_string_frac48(siftable, frac):
    maker_font_verdana_bold_48.FONT.paint(siftable, 0, 0, '/', area=(128,108), alignment=(sift.util.font.ALIGNMENT_CENTER, sift.util.font.ALIGNMENT_MIDDLE), scale=1)
    maker_font_verdana_bold_48.FONT.paint(siftable, 0, 0, str(frac[0]), area=(62,56), alignment=(sift.util.font.ALIGNMENT_RIGHT, sift.util.font.ALIGNMENT_BOTTOM), scale=1)
    maker_font_verdana_bold_48.FONT.paint(siftable, 65, 48, str(frac[1]), area=(46,48), alignment=(sift.util.font.ALIGNMENT_LEFT, sift.util.font.ALIGNMENT_TOP), scale=1)

_kwargs_alpha24 = {
    "area":(128,128),
    "alignment":(sift.util.font.ALIGNMENT_CENTER, sift.util.font.ALIGNMENT_MIDDLE),
    "scale":1
}
def calc_string_bounds_alpha24(msg):
    x,y,w,h = -1,-1,-1,-1
    chars = maker_font_verdana_bold_24.FONT._build_lines(msg, **_kwargs_alpha24)
    x,y = chars[0][0][1], chars[0][0][2]
    w,h = chars[-1][-1][1] + chars[-1][-1][5] - x, chars[-1][-1][2] + chars[-1][-1][6] - y
    return x-2,y,w+4,h
def paint_string_alpha24(s, msg):
    maker_font_verdana_bold_24.FONT.paint(s, 0, 0, msg, **_kwargs_alpha24)


_kwargs_alpha48 = {
    "area":(128,96),
    "alignment":(sift.util.font.ALIGNMENT_CENTER, sift.util.font.ALIGNMENT_MIDDLE),
    "scale":1,
}
def calc_string_bounds_alpha48(msg):
    x,y,w,h = -1,-1,-1,-1
    chars = maker_font_verdana_bold_48.FONT._build_lines(msg, **_kwargs_alpha48)
    x,y = chars[0][0][1], chars[0][0][2]
    w,h = chars[-1][-1][1] + chars[-1][-1][5] - x, chars[-1][-1][2] + chars[-1][-1][6] - y
    return x-2,y,w+4,h

def paint_string_alpha48(s, msg):
    maker_font_verdana_bold_48.FONT.paint(s, 0, 0, msg, **_kwargs_alpha48)

_kwargs_alpha84 = {
    "area":(128,84),
    "alignment":(sift.util.font.ALIGNMENT_CENTER, sift.util.font.ALIGNMENT_MIDDLE),
    "scale":1,
}
def calc_string_bounds_alpha84(msg):
    x,y,w,h = -1,-1,-1,-1
    chars = maker_font_verdana_bold_84.FONT._build_lines(msg, **_kwargs_alpha84)
    x,y = chars[0][0][1], chars[0][0][2]
    w,h = chars[-1][-1][1] + chars[-1][-1][5] - x, chars[-1][-1][2] + chars[-1][-1][6] - y
    return x-2,16+y,w+4,h-12

def paint_string_alpha84(s, msg):
    maker_font_verdana_bold_84.FONT.paint(s, 0, 6, msg, **_kwargs_alpha84)


def timer_needs_paint(time_remaining, time_max, dt):
    """
    Returns true if a tick of dt will necessitate a paint of the
    timer, where the time left was time_remaining
    """
    if time_max < float("inf") and time_max > 0:
        time_remaining_fraction = time_remaining/time_max
        new_time_remaining_fraction = max(0, time_remaining - dt)/time_max
    else:
        return False  
    line_width = time_remaining_fraction * 48
    new_line_width = new_time_remaining_fraction * 48
#    print "---"
#    print line_width
#    print new_line_width
#    print math.floor(line_width) - math.floor(new_line_width)
    return math.floor(line_width) - math.floor(new_line_width) >= 1.0

