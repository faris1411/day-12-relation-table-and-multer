function submitForm() {
  const emailReceiver = 'faris141115@gmail.com';

  let name = document.getElementById('input-name');
  let email = document.getElementById('input-email');
  let phone = document.getElementById('input-phone');
  let subject = document.getElementById('input-subject');
  let message = document.getElementById('input-message');

  name = name.value;
  email = email.value;
  phone = phone.value;
  subject = subject.value;
  message = message.value;

  console.log('name'.name);

  if (name == '') {
    return alert('Name must be filled');
  } 
  if (email == '') {
    return alert('Email must be filled');
  } 
  if (phone == '') {
    return alert('Phone must be filled');
  } 
  if (subject == '') {
    return alert('Subject must be filled');
  } 
  if (message == '') {
    return alert('Message must be filled');
  }
  
  const a = document.createElement('a');

  a.href = `mailto:${emailReceiver}?subject=${subject}&body=Hello my name ${name}, ${subject}, ${message}`;
  a.target = '_blank';
  a.click();
}