self.addEventListener('push', (e) => {
  const data = e.data.json();
  self.registration.showNotification(data.title, {
    data: data.url,
    body: data.body,
    icon: data.icon,
  });
});

self.addEventListener('notificationclick', function(event) {  
  let url = event.notification.data;
  if (!url) return;
  event.notification.close();

  event.waitUntil(
    clients.matchAll({  
      type: "window"  
    })
    .then(function(clientList) {  
      for (var i = 0; i < clientList.length; i++) {  
        var client = clientList[i];  
        if (client.url == '/' && 'focus' in client)  
          return client.focus();  
      }  
      if (clients.openWindow) {
        return clients.openWindow(url);  
      }
    })
  );
});

// self.onnotificationclick = function(event) {
//   console.log('On notification click: ', event.notification.tag);
//   event.notification.close();

//   // This looks to see if the current is already open and
//   // focuses if it is
//   event.waitUntil(clients.matchAll({
//     type: "window"
//   }).then(function(clientList) {
//     for (var i = 0; i < clientList.length; i++) {
//       var client = clientList[i];
//       if (client.url == '/' && 'focus' in client)
//         return client.focus();
//     }
//     if (clients.openWindow)
//       return clients.openWindow('/');
//   }));
// };

// self.onnotificationclick = function(event) {
//   let url = event.notification.data;
//   console.log(url)
//   if (!url) return;
//   event.notification.close(); // Android needs explicit close.
//   event.waitUntil(
//     clients.matchAll({type: 'window'}).then( windowClients => {
//       console.log('hello')
//         // Check if there is already a window/tab open with the target URL
//         for (var i = 0; i < windowClients.length; i++) {
//           var client = windowClients[i];
//           // If so, just focus it.
//           if (client.url === url && 'focus' in client) {
//               return client.focus();
//           }
//         }
//         console.log('hi')
//         // If not, then open the target URL in a new window/tab.
//         if (clients.openWindow) {
//           return clients.openWindow(url);
//         }
//     })
//   );
// }