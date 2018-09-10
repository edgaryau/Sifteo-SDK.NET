num_blocks = 3
#file_in = open('small_list.txt', 'r')
file_in = open('word_list.txt', 'r')
file_out = open('cubeified.txt', 'w')
words_in = file_in.readlines()
out = ""
#next = 'basic\n'
for next in words_in:
    #next = next[:(len(next)-1)] #clip \n
    if len(next) > 4*num_blocks: #4 char./block max.
        pass
    left = len(next) % num_blocks #number of leftover letters
    n = len(next)/num_blocks
    new = ''
    i = 0
    while i <= (len(next)-left-n-1):
        new = new + next[i:i+n] + ','
        i += n
    #new = new + next[i: len(next)] + "\n"
    new = new + next[i: len(next)]
    out = out + new
    #out = out + new + "\n"
file_out.write(out)


