function poll(){
    $.ajax({
        type: "get",
        url: "/notifications",
        dataType: "json",
        success: function (notifications) {
            notifications = JSON.parse(notifications);
            for(n of notifications.filter(n=>n.object_type == "friend_request")){
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
            let count = parseInt($("#friendNotificationsCount").text());
            if(!isNaN(count)){
                count += notifications.length;
            }else{
                count = notifications.length;
            }
            $("#friendNotificationsCount").html(count)
        },
        complete: poll,
        timeout:30000
    });
}
poll();