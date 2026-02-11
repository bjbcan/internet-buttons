#!/bin/bash
#scp -r * pi@pihole:~/internet-buttons/
rsync -avz --delete --progress ./* pi@pihole:~/internet-buttons/
ssh pihole 'sudo systemctl restart internet-buttons'
ssh pihole 'sudo systemctl status internet-buttons'

