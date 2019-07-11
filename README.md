# Web Security 101 demo material

This is all the source used to run the demo. You can find the following applications:

* `Kind of Secure Chat`: this is the vulnerable web application used throughout the demo. Check previous commits for versions vulnerable to CSRF and XSS. Currently this continues to be vulnerable to AWS cluster admin access.
* `aws_admin_creator`: tool used to create the admin user in AWS.
* `xss_receiver_server`: server used by the hacker to log stolen cookies.
