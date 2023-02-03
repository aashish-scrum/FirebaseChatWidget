<template>
	<div class="mask" v-bind:class="isBoxOpen">
		<div class="container">
			<section class="conversation">
				<header class="conversation__header">
					<div class="conversation__info">
						<span class="conversation__status"></span>
						<span class="conversation__name">ChatBox</span>
					</div>
					<div class="conversation__header-actions">
						<a href="javascript:void(0)" v-if="state.data != ''" style="font-size: x-small;padding: 15px 10px;" @click="endChat()">End Chat</a>
						<button class="conversation__btn btn btn--close" title="Close chat" @click="toggleBox">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
								fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
								stroke-linejoin="round" v-if="isBoxOpen == ''">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
								class="bi bi-chevron-up" viewBox="0 0 16 16" v-else>
								<path fill-rule="evenodd"
									d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z" />
							</svg>
						</button>
					</div>
				</header>
				<div class="conversation__body" v-if="state.data == '' || state.data === null">
					<form class="login-form" @submit.prevent="StartChat">
						<div class="form-inner">
							<label for="">Ask your Question <span style="color:red;">*</span></label>
							<input type="text" v-model="inputQuestion" class="form-control" /><br>
							<input type="submit" value="Start Chat" />
						</div>
					</form>
				</div>
				<div class="conversation__body" ref="hasScrolledToBottom" v-else>
					<template v-for="message in state.messages" :key="message.key">
						<div class="conversation__bubble conversation__bubble--right" v-if="message.sender == state.data.visitor_id">
							<p class="conversation__text">{{ message.message }}</p>
						</div>
						<div class="conversation__bubble conversation__bubble--left" v-else-if="message.sender == state.data.operator_id">
							<p class="conversation__text">{{ message.message }}</p>
						</div>
					</template>
					<div v-if="state.data.type == 'closedbyoperator'" style="border-left: 5px solid #54e1ff; background-color: #54e1ff30; padding: 3px 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;" >
						<p style="font-size: 10px; font-weight: 600;">Operator has ended the chat.</p>
					</div>
				</div>
				<footer v-if="state.data != '' && state.data.type != 'closedbyoperator'">
					<form class="conversation__footer" @submit.prevent="SendMessage">
						<input type="text" class="conversation__write" placeholder="Write a message..."
							v-model="inputMessage" />
						<button type="submit" class="conversation__btn btn btn--send">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
								fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
								stroke-linejoin="round">
								<line x1="22" y1="2" x2="11" y2="13"></line>
								<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
							</svg>
						</button>
					</form>
				</footer>
				<footer v-else-if="state.data.type == 'closedbyoperator'">
					<button class="btn" style="width: 100%;color:whitesmoke;background-color: #4867cb;" @click="endChat()">End Chat</button>
				</footer>
			</section>
		</div>
	</div>
</template>

<script>
import { reactive, onMounted, onUpdated, ref } from 'vue';
import axios from 'axios';
import db from './db';

export default {
	setup() {
		const API_URL = "http://192.168.2.116:8000";
		const $_Chat_Property = window.$_Chat_AccountKey;
		const $_Chat_WidgetId = window.$_Chat_WidgetId;

		const inputQuestion = ref("");
		const inputMessage = ref("");
		
		let isBoxOpen = ref('minimize');
		let hasScrolledToBottom = ref('');
		var unsubscribe;
		const state = reactive({
			data : (localStorage.getItem("visitor_data") !== null) ? JSON.parse(localStorage.getItem("visitor_data")) : '',
			messages: []
		});

		const randomNumber = (min, max) => { 
			min = Math.ceil(min);
			max = Math.floor(max);
			return Math.floor(Math.random() * (max - min + 1)) + min;
		}

		const StartChat = async () => {
			if (inputQuestion.value.trim().length > 0 && state.data.visitor_id === undefined) {
				let id = `V${randomNumber(100000000000000,999999999999999)}`;
				let pendingVisitor = {
					property_id : $_Chat_Property,
					widget_id : $_Chat_WidgetId,
					visitor_id : id,
					type : 'pending',
					message : inputQuestion.value,
					timestamp : Date.now(),
				};
				localStorage.setItem('visitor_data', JSON.stringify(pendingVisitor));
				state.data = pendingVisitor;
				db.collection("visitors").doc(id).set(pendingVisitor)
				.then(() => {
					console.log("Document successfully written!");
					SyncData();
					inputQuestion.value = '';
				})
				.catch((error) => {
					console.error("Error writing document: ", error);
				});
			}
		}

		const SyncData = () => {
			if(state.data.visitor_id !== undefined){
				if(state.data.type == 'pending'){
					state.messages.push({
						sender : state.data.visitor_id,
						receiver : null,
						message : state.data.message,
						read : 0,
						timestamp : state.data.timestamp,
					});
				}
				unsubscribe = db.collection("visitors")
				.where("visitor_id", "==", state.data.visitor_id)
				.where("property_id", "==", $_Chat_Property)
				.where("widget_id", "==", $_Chat_WidgetId)
				.onSnapshot((querySnapshot) => {
					querySnapshot.docChanges().forEach((change) => {
						if (change.type === "modified") {
							state.data = change.doc.data();
							localStorage.setItem('visitor_data', JSON.stringify(change.doc.data()));
							fetchMassages();
						}
					});
				});
			}
		}

		const toggleBox = () => {
			isBoxOpen.value = (isBoxOpen.value == '') ? 'minimize' : '';
		}

		const SendMessage = () => {
			if (inputMessage.value.trim().length == 0 || state.data.type != 'active') {
				inputMessage.value = "";
				return;
			}
			const messagesRef = db.collection('chat_room').doc(state.data.chat_room_id).collection('messages');
			const message = {
				sender: state.data.visitor_id,
				receiver: state.data.operator_id,
				message: inputMessage.value,
				read: 0,
				timestamp: Date.now()
			}
			messagesRef.add(message);
			inputMessage.value = "";
		}

		const scrollBottom = () => {
			if (state.messages.length > 1 && state.data != '') {
				db.collection("chat_room").doc(state.data.chat_room_id)
					.collection('messages').where("read", "==", 0).where("sender", "==", state.data.operator_id)
					.onSnapshot((querySnapshot) => {
						querySnapshot.forEach((doc) => {
							db.collection("chat_room").doc(state.data.chat_room_id).collection('messages').doc(doc.id).update({read:1});
						});
					});

				let el = hasScrolledToBottom.value;
				el.scrollTop = el.scrollHeight;
			}
		}

		const fetchMassages = () => {
			if(state.data != '' && state.data.type == 'closedbyoperator'){
				if(localStorage.getItem("messages") === null){
					localStorage.setItem('messages', state.data.messages);
				}
				state.messages = JSON.parse(localStorage.getItem("messages"));
			}
			if(state.data != '' && state.data.type == 'active'){
				db.collection('chat_room').doc(state.data.chat_room_id)
					.collection('messages').orderBy("timestamp").onSnapshot((querySnapshot) => {
						let messages = [];
						querySnapshot.forEach((doc) => {
							messages.push(doc.data());
						});
						state.messages = messages;
				});
			}
		}

		const endChat = () => {
			unsubscribe();
			if(state.data.type == 'active'){
				db.collection("visitors").doc(state.data.visitor_id).update({type : 'closedbyvisitor',timestamp : Date.now()});
			}
			localStorage.removeItem('visitor_data');
			localStorage.removeItem('messages');
			state.data = '';
			state.messages = [];
		}

		onMounted(() => {
			SyncData();
			fetchMassages();
		});

		onUpdated(() => {
			scrollBottom();
		});
		
		return {
			inputQuestion,
			StartChat,
			SyncData,
			randomNumber,
			state,
			inputMessage,
			SendMessage,
			fetchMassages,
			toggleBox,
			isBoxOpen,
			scrollBottom,
			endChat,
			hasScrolledToBottom
		}
	}
}
</script>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500&display=swap');

// Resets
#chat-widget * {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
	transition: all 150ms ease-in-out;
}

#chat-widget button {
	border: 0;
	background-color: transparent;
	cursor: pointer;
}

@mixin scrollbars($size, $foreground-color, $background-color: mix($foreground-color, white,  50%)) {
  // For Google Chrome
  &::-webkit-scrollbar {
    width:  $size;
    height: $size;
  }

  &::-webkit-scrollbar-thumb {
    background: $foreground-color;
	border-radius: 5px;
  }

  &::-webkit-scrollbar-track {
    background: $background-color;
  }

  // For Internet Explorer
  & {
    scrollbar-face-color: $foreground-color;
    scrollbar-track-color: $background-color;
  }
}

// Mixins //
@mixin truncate-text {
	width: 215px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 500px) {
		width: 85%;
	}
}



// Global scope classes to use with JS
#chat-widget div.minimize {
	height: 40px;
}

#chat-widget .conversation__bubble--left {
	position: relative;

	.conversation__text {
		float: left;
		max-width: 85%;
		color: hsl(203, 100%, 94%);
		background-color: hsl(226, 56%, 54%);
	}

	&:before {
		content: '';
		position: absolute;
		bottom: -6px;
		left: 0;
		width: 8px;
		height: 8px;
		border-bottom-right-radius: 10px;
		background-color: hsl(226, 48%, 38%);
	}
}

#chat-widget .conversation__bubble--right {
	position: relative;

	.conversation__text {
		float: right;
		max-width: 85%;
		color: hsl(42, 100%, 10%);
		background-color: #f9f9f9;
	}

	&:before {
		content: '';
		position: absolute;
		bottom: -6px;
		right: 0;
		width: 8px;
		height: 8px;
		border-bottom-left-radius: 10px;
		background-color: #dcdcdc;
	}
}

// Everything else
#chat-widget {
	font-family: 'Poppins', sans-serif;
	color: hsl(213, 56%, 16%);
	overflow-y: hidden;
}

#chat-widget .mask {
	width: 300px;
	height: 400px;
	overflow: hidden;
	position: absolute;
	bottom: 0;
	right: 5rem;
	border-top-left-radius: 10px;
	border-top-right-radius: 10px;
	animation: appear 1s ease-in 0s;
	box-shadow: 0 10px 20px #00000026, 0 3px 6px #0000001a;
	transition: height 400ms cubic-bezier(.65, .05, .36, 1);

	@media (max-width: 500px) {
		right: 0;
		width: auto;
		height: 100vh;
	}
}

#chat-widget .container {
	width: 600px;
	height: 400px;
	display: flex;
	flex-direction: row;
	// transform: translateX(-300px);
	transition: transform 400ms cubic-bezier(.65, .05, .36, 1);

	@media (max-width: 500px) {
		width: 100%;
		height: 100%;
		transform: translateX(0);
	}
}

#chat-widget .conversation {
	width: 300px;
	height: 400px;
	display: flex;
	flex-direction: column;
	background-color: hsl(216, 33%, 97%);

	@media (max-width: 500px) {
		width: 100vw;
		height: 100vh;
	}

	&__header {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		z-index: 1;
		min-height: 40px;
		border-bottom: 1px solid hsl(210, 14%, 83%);
	}

	// Removes whitespace between buttons set by the browser
	&__header-actions {
		display: flex;
		flex-direction: row;
	}

	&__body {
		height: 100%;
		padding: 0.8rem;
		position: relative;
		overflow-y: auto;
		background-color: hsl(210, 29%, 95%);
		font-size: 14px;
		@include scrollbars(.3em, #4766cc);
	}

	.btn {
		width: 40px;
		height: 40px;

		svg {
			color: hsl(221, 70%, 40%);
		}

		&:hover,
		&:focus {
			background-color: hsl(221, 70%, 40%);

			svg {
				color: hsl(0, 0%, 100%);
			}
		}
	}
}


#chat-widget .conversation {

	&__info {
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		flex-grow: 1;
		padding-left: 0.8rem;
		color: hsl(226, 48%, 27%);
		border-left: 1px solid hsl(210, 14%, 83%);
	}

	&__status {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: hsl(97, 81%, 48%);
		margin-right: 0.4rem;
	}

	&__bubble {
		margin-bottom: 0.8rem;

		&:before,
		&:after {
			content: '';
			display: block;
			clear: both;
		}
	}

	&__text {
		border-radius: 3px;
		padding: 0.6rem;
		overflow-wrap: break-word;
	}

	&__footer {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		z-index: 1;
		padding: 0.8rem;
		border-top: 1px solid hsl(210, 14%, 83%);
	}

	&__write {
		width: 80%;
		padding: 0.4rem;
		border: 0;
		border-radius: 5px;
		border: 1px solid hsl(210, 14%, 83%);
		font-family: 'Poppins', sans-serif;
		font-size: 14px;

		&:focus {
			border: 1px solid hsl(226, 56%, 54%);
			box-shadow: 0 0 3px hsl(226, 56%, 54%);
		}
	}

	.btn--send {
		border-radius: 3px;
	}

}


@keyframes appear {
	1% {
		transform: translateY(30px);
		opacity: 0;
	}

	25% {
		transform: translateY(-15px);
	}

	65% {
		transform: translateY(10px);
		opacity: 1;
	}

	80% {
		transform: translateY(-5px);
	}

	100% {
		transform: translateY(0);
	}
}
</style>
