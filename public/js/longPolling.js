function poll(){
    $.ajax({
        type: "get",
        url: "/notifications",
        dataType: "json",
        success: function (notifications) {
            notifications = JSON.parse(notifications);
            let friendNotifications = notifications.filter(n=>n.object_type == "friend_request");
            for(n of friendNotifications){
                $("#friendNotifications").prepend(`
                <a class="dropdown-item d-flex align-items-center" href="`+n.url+`">
                    <div class="mr-3">
                        <img src="/`+n.sender_picture+`" class="icon-circle bg-primary">
                           
                        </img>
                    </div>
                    <div>
                        <div class="small text-gray-500">`+n.date+`</div>
                        <span class="font-weight-bold">`+n.sender_username+` `+n.activity_type+` a friend request</span>
                    </div>
                </a>
            `)
            }
            let otherNotifications = notifications.filter(n=>n.object_type == "project_invite");
            for(n of otherNotifications){
                $("#notifications").prepend(`
                <a class="dropdown-item d-flex align-items-center" href="`+n.url+`">
                    <div class="mr-3">
                        <img src="/`+n.sender_picture+`" class="icon-circle bg-primary">
                           
                        </img>
                    </div>
                    <div>
                        <div class="small text-gray-500">`+n.date+`</div>
                        <span class="font-weight-bold">`+n.message+`</span>
                    </div>
                </a>
            `)
            }
            let friendcount = parseInt($("#friendNotificationsCount").text());
            if(!isNaN(friendcount)){
                friendcount += friendNotifications.length;
            }else{
                friendcount = friendNotifications.length;
            }
            friendcount = (friendcount>0)? friendcount : '';
            $("#friendNotificationsCount").html(friendcount)

            let count = parseInt($("#notificationCount").text());
            if(!isNaN(count)){
                count += otherNotifications.length;
            }else{
                count = otherNotifications.length;
            }
            count = (count>0)? count : '';
            $("#notificationCount").html(count)
        },
        complete: poll,
        timeout:30000
    });
}
poll();